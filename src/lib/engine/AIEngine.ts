import { pipeline, env } from '@huggingface/transformers';
import Tesseract from 'tesseract.js';
import { createExtractionPayload, toMs } from './extraction';

// Disable Node.js local caching paths, strictly forcing secure Browser cache fetching 
env.allowLocalModels = false;

// Global Transcriber Singleton (loads WebGPU pipeline)
type TranscriberChunk = {
   text?: string;
   timestamp?: [number, number?];
};

type TranscriberOutput = {
   text?: string;
   chunks?: TranscriberChunk[];
};

type TranscriberFn = (audio: Float32Array, options: {
   chunk_length_s: number;
   stride_length_s: number;
   return_timestamps: boolean;
}) => Promise<TranscriberOutput>;

type OcrWord = {
   text: string;
   confidence: number;
   bbox: { x0: number; y0: number; x1: number; y1: number };
};

let transcriber: TranscriberFn | null = null;

export async function processAI(
  taskId: string,
  actualFile: File,
  originalExt: string,
  mode: string,
  targetFormat: string,
  onProgress: (progress: number) => void
): Promise<{ url: string; extension: string }> {

  let finalBlob: Blob = new Blob(["Engine Error during logic allocation"]);
  let outputExt = "txt";
  const tl = targetFormat.toLowerCase();
   const wantsStructuredTimestamps = tl.includes("json") || tl.includes("subtitle") || tl.includes("srt") || tl.includes("timestamp");

  onProgress(5);

   if (tl.includes("ocr")) {
      // 100% Offline Assembly OCR Tesseract Model implementation
      onProgress(15);
      
      const imageUrl = URL.createObjectURL(actualFile);
      const worker = await Tesseract.createWorker("eng", 1, {
         logger: (m) => {
             if (m.status === "recognizing text") {
                 onProgress(15 + Math.round(m.progress * 80));
             }
         }
      });
      
      const ret = await worker.recognize(imageUrl);
      const ocrData = ret.data as unknown as { text?: string; words?: OcrWord[] };
      const words = ocrData.words || [];
      const rawText = ocrData.text || "";
      
      if (tl.includes("json")) {
         outputExt = "json";
         const payload = createExtractionPayload({
            engine: "image",
            sourceExtension: originalExt,
            rawText,
                  segments: words.map((w, index) => ({
              id: `word-${index}`,
              kind: "word",
              text: w.text,
              confidence: w.confidence,
              source: {
                x0: w.bbox.x0,
                y0: w.bbox.y0,
                x1: w.bbox.x1,
                y1: w.bbox.y1,
              },
            })),
            metadata: {
              language: "eng",
                     wordCount: words.length,
            },
         });
         finalBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      } else {
         outputExt = "txt";
         finalBlob = new Blob([rawText], { type: "text/plain" });
      }
      
      await worker.terminate();
      URL.revokeObjectURL(imageUrl);
      onProgress(100);
      
   } else if (tl.includes("transcript") || tl.includes("subtitle") || tl.includes("timestamp") || tl.includes("srt")) {
      // Offline WebGPU Transcriber Engine natively caching Whisper Weights
      
      if (!transcriber) {
         // Instantiate WebGPU acceleration conditionally checking hardware boundaries
          transcriber = (await pipeline('automatic-speech-recognition', 'Xenova/whisper-tiny.en', {
             progress_callback: (d: { status?: string; loaded?: number; total?: number }) => {
                 if (d.status === "downloading") {
                    // Downloading pipeline weights linearly maps up to ~30% of total latency timeline
                  const loaded = d.loaded || 0;
                  const total = d.total || 1;
                  onProgress(Math.round((loaded / total) * 30));
                 }
             }
          })) as unknown as TranscriberFn;
      }
      
      onProgress(35);
      
      // Native F32 Array transformation buffer mapping for Transformer Audio Processing constraints
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      const arrayBuffer = await actualFile.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      const offlineFloat32 = audioBuffer.getChannelData(0); // WebGPU models exclusively mandate Mono flat floats
      
      onProgress(50);
      
      const output = await transcriber(offlineFloat32, { 
         chunk_length_s: 30,
         stride_length_s: wantsStructuredTimestamps ? 5 : 0,
         return_timestamps: wantsStructuredTimestamps,
      });
      await audioCtx.close();
      
      onProgress(95);
      
      if (tl.includes("json")) {
         outputExt = "json";
         const payload = createExtractionPayload({
            engine: "media",
            sourceExtension: originalExt,
            rawText: output.text || "",
                           segments: (output.chunks || []).map((chunk: TranscriberChunk, index: number) => ({
              id: `chunk-${index}`,
              kind: "chunk",
              text: (chunk.text || "").trim(),
              startMs: toMs(chunk.timestamp?.[0]),
              endMs: toMs(chunk.timestamp?.[1]),
            })),
            metadata: {
              model: "Xenova/whisper-tiny.en",
            },
         });
         finalBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
        } else if (tl.includes("srt") || tl.includes("subtitle")) {
         outputExt = "srt";
         let srt = "";
           (output.chunks || []).forEach((chunk: TranscriberChunk, i: number) => {
             const formatTime = (seconds: number) => new Date(seconds * 1000).toISOString().substring(11, 23).replace('.', ',');
             const startSec = chunk.timestamp?.[0] || 0;
             const endSec = chunk.timestamp?.[1] || startSec + 2;
             srt += `${i + 1}\n${formatTime(startSec)} --> ${formatTime(endSec)}\n${(chunk.text || "").trim()}\n\n`;
         });
         finalBlob = new Blob([srt], { type: "text/plain" });
      } else {
         outputExt = "txt";
         finalBlob = new Blob([output.text || ""], { type: "text/plain" });
      }
      
      onProgress(100);
   } else {
         outputExt = "txt";
         finalBlob = new Blob(["Unsupported extraction target for AI pipeline."], { type: "text/plain" });
         onProgress(100);
  }

  return { url: URL.createObjectURL(finalBlob), extension: outputExt };
}
