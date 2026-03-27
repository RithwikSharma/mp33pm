import { getFFmpegWorker } from "./WorkerFactory";
import { fetchFile } from "@ffmpeg/util";
import { StorageManager } from "../pipeline/StorageManager";
import { processAI } from "./AIEngine";
import { parseCompressionPreset } from "../pipeline/compressionTargets";
import { createExtractionPayload } from "./extraction";

export async function processMedia(
  taskId: string,
  originalFile: File | null,
  originalExt: string,
  mode: string,
  targetFormat: string,
  onProgress: (progress: number) => void
): Promise<{ url: string, extension: string }> {
  const ffmpeg = await getFFmpegWorker();

  const progressHandler = ({ progress }: { progress: number }) => {
    onProgress(Math.round(progress * 100));
  };

  ffmpeg.on("progress", progressHandler);

  // Pull from OPFS cache if file is heavy (indicated by originalFile being null)
  const actualFile = originalFile ? originalFile : await StorageManager.getFromOPFS(taskId);
  if (!actualFile) throw new Error("Failed to load massive file from SSD OPFS cache.");

  const inputName = `input_${taskId.substring(0,6)}.${originalExt}`;
  await ffmpeg.writeFile(inputName, await fetchFile(actualFile));
  const tl = targetFormat.toLowerCase();

  const cleanupInput = async () => {
    try {
      await ffmpeg.deleteFile(inputName);
    } catch {
      // noop
    }
    if (!originalFile) {
      await StorageManager.removeFromOPFS(taskId);
    }
  };

  if (mode === "ai_extract") {
    // Chunk-based extraction avoids loading very large Float32 buffers at once in the browser.
    let durationSeconds = 0;
    const durationLogParser = ({ message }: { message: string }) => {
      const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/);
      if (durationMatch) {
        const h = parseInt(durationMatch[1], 10);
        const m = parseInt(durationMatch[2], 10);
        const s = parseFloat(durationMatch[3]);
        durationSeconds = (h * 3600) + (m * 60) + s;
      }
    };

    ffmpeg.on("log", durationLogParser);
    try {
      await ffmpeg.exec(["-i", inputName, "-f", "null", "-"]);
    } catch {
      // noop: this run is only used to scrape duration
    } finally {
      ffmpeg.off("log", durationLogParser);
    }

    const wantsJson = tl.includes("json") || tl.includes("timestamp");
    const wantsSrt = tl.includes("srt") || tl.includes("subtitle");
    const needsTimestamps = wantsJson || wantsSrt;
    const aiTarget = needsTimestamps ? "Timestamped JSON Array (.json)" : "Transcript (.txt)";

    // Keep chunks bounded for memory safety, but reduce total chunk count on medium-size files for throughput.
    const chunkSeconds = actualFile.size <= 64 * 1024 * 1024 ? 300 : 120;
    const chunkCount = durationSeconds > 0 ? Math.max(1, Math.ceil(durationSeconds / chunkSeconds)) : 1;
    const mergedSegments: Array<{ text: string; startMs?: number; endMs?: number }> = [];
    const mergedText: string[] = [];

    for (let i = 0; i < chunkCount; i++) {
      const startSec = i * chunkSeconds;
      const chunkName = `extract_${taskId.substring(0, 8)}_${i}.wav`;
      const extractionArgs = durationSeconds > 0
        ? ["-ss", `${startSec}`, "-i", inputName, "-t", `${chunkSeconds}`, "-vn", "-ac", "1", "-ar", "16000", chunkName]
        : ["-i", inputName, "-vn", "-ac", "1", "-ar", "16000", chunkName];

      const extractionCode = await ffmpeg.exec(extractionArgs);
      if (extractionCode !== 0) {
        ffmpeg.off("progress", progressHandler);
        await cleanupInput();
        throw new Error("Failed to prepare chunked media for transcript extraction.");
      }

      const extractedData = await ffmpeg.readFile(chunkName);
      await ffmpeg.deleteFile(chunkName);

      const data = extractedData as Uint8Array;
      if (!(data instanceof Uint8Array) || data.byteLength === 0) continue;

      const audioBlob = new Blob([data as unknown as BlobPart], { type: "audio/wav" });
      const audioFile = new File([audioBlob], `extract_${taskId}_${i}.wav`, { type: "audio/wav" });

      const { url } = await processAI(
        `${taskId}_${i}`,
        audioFile,
        "wav",
        "ai_extract",
        aiTarget,
        (chunkProgress) => {
          const startPct = (i / chunkCount) * 100;
          const spanPct = 100 / chunkCount;
          onProgress(Math.min(99, Math.round(startPct + (chunkProgress / 100) * spanPct)));
        }
      );

      const payloadText = await fetch(url).then((res) => res.text());
      URL.revokeObjectURL(url);

      if (!needsTimestamps) {
        if (payloadText.trim()) mergedText.push(payloadText.trim());
        // Yield to keep the UI responsive between long-running chunks.
        await new Promise((resolve) => setTimeout(resolve, 0));
        continue;
      }

      try {
        const payload = JSON.parse(payloadText) as {
          rawText?: string;
          segments?: Array<{ text?: string; startMs?: number; endMs?: number }>;
        };

        if (payload.rawText) mergedText.push(payload.rawText);
        for (const segment of payload.segments || []) {
          mergedSegments.push({
            text: segment.text || "",
            startMs: typeof segment.startMs === "number" ? segment.startMs + Math.round(startSec * 1000) : undefined,
            endMs: typeof segment.endMs === "number" ? segment.endMs + Math.round(startSec * 1000) : undefined,
          });
        }
      } catch {
        if (payloadText.trim()) mergedText.push(payloadText.trim());
      }

      // Yield to keep the UI responsive between long-running chunks.
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    ffmpeg.off("progress", progressHandler);
    await cleanupInput();
    onProgress(100);

    const combinedText = mergedText.join("\n\n").trim();

    if (wantsJson) {
      const payload = createExtractionPayload({
        engine: "media",
        sourceExtension: originalExt,
        rawText: combinedText,
        segments: mergedSegments.map((segment, index) => ({
          id: `chunk-${index}`,
          kind: "chunk",
          text: segment.text,
          startMs: segment.startMs,
          endMs: segment.endMs,
        })),
        metadata: {
          chunkSeconds,
          chunkCount,
        },
      });
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      return { url: URL.createObjectURL(blob), extension: "json" };
    }

    if (wantsSrt) {
      const formatSrtTime = (ms: number) => {
        const date = new Date(ms);
        return date.toISOString().substring(11, 23).replace('.', ',');
      };

      let srt = "";
      mergedSegments.forEach((segment, index) => {
        const start = segment.startMs ?? 0;
        const end = segment.endMs ?? start + 2000;
        srt += `${index + 1}\n${formatSrtTime(start)} --> ${formatSrtTime(end)}\n${segment.text.trim()}\n\n`;
      });
      const blob = new Blob([srt], { type: "text/plain;charset=utf-8" });
      return { url: URL.createObjectURL(blob), extension: "srt" };
    }

    const blob = new Blob([combinedText], { type: "text/plain;charset=utf-8" });
    return { url: URL.createObjectURL(blob), extension: "txt" };
  }

  // Determine Ext and Commands based directly on Staging logic mapped in FileAnalyzer
  let extension = originalExt;
  const params: string[] = ["-i", inputName];

  // Map Format strings into Ext
  if (mode === "convert") {
    // Format Switches
    if (tl.includes("mp4")) extension = "mp4";
    else if (tl.includes("webm")) extension = "webm";
    else if (tl.includes("gif")) extension = "gif";
    else if (tl.includes("mkv")) extension = "mkv";
    else if (tl.includes("wav")) extension = "wav";
    else if (tl.includes("mp3") || tl.includes("audio")) extension = "mp3";
    else if (tl.includes("ogg")) extension = "ogg";
    else if (tl.includes("flac")) extension = "flac";

    // Re-encoding maps
    if (extension === "mp4") params.push("-c:v", "libx264", "-c:a", "aac");
    if (extension === "webm") params.push("-c:v", "libvpx", "-c:a", "libvorbis");
    if (extension === "mp3") params.push("-q:a", "0"); 
  } else if (mode === "compress") {
     // Compression preserves video formats, but MUST convert Lossless Audio (WAV) to Lossy (MP3) mathematically to compress it
     const isAudio = ["mp3", "wav", "ogg", "flac", "m4a", "aac"].includes(originalExt);
     const isLosslessAudio = ["wav", "flac", "alac", "aiff"].includes(originalExt);
     
     extension = isLosslessAudio ? "mp3" : originalExt;

    const preset = parseCompressionPreset(targetFormat);
    const scaleFactor = preset / 100;

     // We must dynamically scrape duration via dummy executing to calculate strict mathematical Bitrate limits!
     let durationSeconds = 0;
     const logParser = ({ message }: { message: string }) => {
         const durationMatch = message.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d+)/);
         if (durationMatch) {
             const h = parseInt(durationMatch[1], 10);
             const m = parseInt(durationMatch[2], 10);
             const s = parseFloat(durationMatch[3]);
             durationSeconds = (h * 3600) + (m * 60) + s;
         }
     };

     ffmpeg.on("log", logParser);
    try { await ffmpeg.exec(["-i", inputName, "-f", "null", "-"]); } catch {} // Instigates structural parsing into stream
     ffmpeg.off("log", logParser);

     if (durationSeconds > 0) {
         // Exact math to constrain the physical output byte size securely
         const targetSizeKB = (actualFile.size / 1024) * scaleFactor;
         const totalTargetKbps = Math.floor((targetSizeKB * 8) / durationSeconds);

         if (isAudio) {
            params.push("-c:a", extension === "mp3" ? "libmp3lame" : "aac");
            params.push("-b:a", `${totalTargetKbps}k`);
         } else {
            // Prevent visually crippling video by securing minimum audio threshold allocation proportionally
            const audioKbpsLimit = Math.min(128, Math.floor(totalTargetKbps * 0.15));
            const videoKbpsLimit = Math.max(10, totalTargetKbps - audioKbpsLimit);
            
            params.push(
               "-c:v", "libx264", 
               "-b:v", `${videoKbpsLimit}k`, 
               "-preset", "faster", 
               "-c:a", "aac", 
               "-b:a", `${audioKbpsLimit}k`
            );
         }
     } else {
         // Fallback if duration log interception fails asynchronously
         if (!isAudio) {
           if (tl.includes("80%")) params.push("-c:v", "libx264", "-crf", "25", "-preset", "fast", "-c:a", "aac");
           if (tl.includes("50%")) params.push("-c:v", "libx264", "-crf", "28", "-preset", "fast", "-c:a", "aac");
           if (tl.includes("30%")) params.push("-c:v", "libx264", "-crf", "34", "-preset", "veryfast", "-c:a", "aac");
           if (tl.includes("20%")) params.push("-c:v", "libx264", "-crf", "42", "-preset", "veryfast", "-c:a", "aac");
         } else {
           if (extension === "mp3") params.push("-c:a", "libmp3lame");
           else if (extension === "m4a") params.push("-c:a", "aac");
           else if (extension === "ogg") params.push("-c:a", "libvorbis");
           
           if (tl.includes("80%")) params.push("-b:a", "192k");
           if (tl.includes("50%")) params.push("-b:a", "128k");
           if (tl.includes("30%")) params.push("-b:a", "64k");
           if (tl.includes("20%")) params.push("-b:a", "32k");
         }
     }
  }

  const outputName = `out_${taskId.substring(0,8)}.${extension}`;
  params.push(outputName);

  console.log(`[MediaEngine] Starting Web Worker: ffmpeg ${params.join(" ")}`);
  
  // Execute via purely local WASM Worker
  const code = await ffmpeg.exec(params);
  if (code !== 0) {
     throw new Error("FFmpeg Worker failed with code: " + code);
  }

  // Read native Uint8Array blob
  const data = await ffmpeg.readFile(outputName);
  
  // Clean up WASM sandbox strictly so we never memory leak between queues
  await ffmpeg.deleteFile(inputName);
  await ffmpeg.deleteFile(outputName);
  if (!originalFile) await StorageManager.removeFromOPFS(taskId); // Wipe OPFS cache

  // Dispatch output link (Coerce SharedArrayBuffer from MT core to BlobPart)
  const blob = new Blob([data as unknown as BlobPart], { type: 'application/octet-stream' });
  ffmpeg.off("progress", progressHandler); // Clean up event listener to prevent overlap on sequential reruns
  return { url: URL.createObjectURL(blob), extension };
}
