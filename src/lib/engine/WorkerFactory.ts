import { FFmpeg } from "@ffmpeg/ffmpeg";

let ffmpeg: FFmpeg | null = null;
let isLoaded = false;

/**
 * Ensures the FFmpeg Core is loaded and cached in memory for subsequent operations
 */
export async function getFFmpegWorker(): Promise<FFmpeg> {
  if (ffmpeg && isLoaded) {
    return ffmpeg;
  }

  ffmpeg = new FFmpeg();
  
  // Attach event log listeners for debugging (if needed)
  ffmpeg.on("log", ({ message }) => {
    if (process.env.NODE_ENV === "development") console.log(`[FFmpeg Log]: ${message}`);
  });

  try {
    console.log("[WorkerFactory] Mounting FFmpeg core-mt (WebAssembly)...");
    
    // Using local public paths injected strictly from NPM installation to avoid CDN dependencies
    const coreURL = "/ffmpeg/ffmpeg-core.js";
    const wasmURL = "/ffmpeg/ffmpeg-core.wasm";
    const workerURL = "/ffmpeg/ffmpeg-core.worker.js";

    await ffmpeg.load({
      coreURL,
      wasmURL,
      workerURL,
    });
    
    isLoaded = true;
    console.log("[WorkerFactory] Successfully mounted FFmpeg Wasm Engine.");
    return ffmpeg;
  } catch (err) {
    console.error(`[WorkerFactory] Critical Error loading FFmpeg Wasm: `, err);
    throw new Error("Unable to load the massive FFmpeg Engine. Verify your browsers SharedArrayBuffer support.");
  }
}
