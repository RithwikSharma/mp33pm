import { getFFmpegWorker } from "./WorkerFactory";
import { fetchFile } from "@ffmpeg/util";
import { StorageManager } from "../pipeline/StorageManager";

export async function processMedia(
  taskId: string,
  originalFile: File | null,
  originalExt: string,
  mode: string,
  targetFormat: string,
  onProgress: (progress: number) => void
): Promise<{ url: string, extension: string }> {
  const ffmpeg = await getFFmpegWorker();

  ffmpeg.on("progress", ({ progress }) => {
    // FFmpeg.wasm returns progress from 0 to 1
    onProgress(Math.round(progress * 100));
  });

  // Pull from OPFS cache if file is heavy (indicated by originalFile being null)
  const actualFile = originalFile ? originalFile : await StorageManager.getFromOPFS(taskId);
  if (!actualFile) throw new Error("Failed to load massive file from SSD OPFS cache.");

  const inputName = `input_${taskId.substring(0,6)}.${originalExt}`;
  await ffmpeg.writeFile(inputName, await fetchFile(actualFile));

  if (mode === "ai_extract") {
    throw new Error("AI Extraction engine (Whisper) is scheduled for Phase 4. Please use Convert or Compress.");
  }

  // Determine Ext and Commands based directly on Staging logic mapped in FileAnalyzer
  let extension = originalExt;
  const params: string[] = ["-i", inputName];

  // Map Format strings into Ext
  const tl = targetFormat.toLowerCase();
  
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

     // Video compression mappings dynamically mapped to user's selected % target
     if (!isAudio) {
       if (tl.includes("80%")) params.push("-c:v", "libx264", "-crf", "25", "-preset", "fast", "-c:a", "aac");
       if (tl.includes("50%")) params.push("-c:v", "libx264", "-crf", "28", "-preset", "fast", "-c:a", "aac");
       if (tl.includes("25%")) params.push("-c:v", "libx264", "-crf", "34", "-preset", "veryfast", "-c:a", "aac");
       if (tl.includes("10%")) params.push("-c:v", "libx264", "-crf", "42", "-preset", "veryfast", "-c:a", "aac");
     } else {
       // Explicit Audio Encoders to prevent header corruption for format swaps
       if (extension === "mp3") params.push("-c:a", "libmp3lame");
       else if (extension === "m4a") params.push("-c:a", "aac");
       else if (extension === "ogg") params.push("-c:a", "libvorbis");
       
       if (tl.includes("80%")) params.push("-b:a", "192k");
       if (tl.includes("50%")) params.push("-b:a", "128k");
       if (tl.includes("25%")) params.push("-b:a", "64k");
       if (tl.includes("10%")) params.push("-b:a", "32k");
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
  return { url: URL.createObjectURL(blob), extension };
}
