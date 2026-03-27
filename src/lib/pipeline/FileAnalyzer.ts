export type FileCategory = "audio" | "video" | "document" | "spreadsheet" | "presentation" | "image" | "unknown";
export type ActionMode = "convert" | "compress" | "ai_extract";

export interface AnalyzedFile {
  originalFile: File;
  category: FileCategory;
  extension: string;
  isHeavy: boolean;
  sizeMB: number;
  availableModes: ActionMode[];
  modeTargets: Partial<Record<ActionMode, string[]>>;
}

export const HEAVY_FILE_THRESHOLD_MB = 100;

export function analyzeFile(file: File): AnalyzedFile {
  const extension = file.name.split('.').pop()?.toLowerCase() || "";
  const sizeMB = file.size / (1024 * 1024);
  const isHeavy = sizeMB > HEAVY_FILE_THRESHOLD_MB;
  
  let category: FileCategory = "unknown";

  const audioExt = ["mp3", "wav", "ogg", "flac", "m4a", "aac"];
  const videoExt = ["mp4", "mkv", "webm", "avi", "mov", "m4v", "wmv"];
  const docExt = ["pdf", "docx", "doc", "txt", "md", "rtf"];
  const sheetExt = ["xlsx", "csv", "xls", "ods"];
  const presExt = ["pptx", "ppt", "key", "odp"];
  const imgExt = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico", "tiff"];

  if (audioExt.includes(extension)) category = "audio";
  else if (videoExt.includes(extension)) category = "video";
  else if (docExt.includes(extension)) category = "document";
  else if (sheetExt.includes(extension)) category = "spreadsheet";
  else if (presExt.includes(extension)) category = "presentation";
  else if (imgExt.includes(extension)) category = "image";

  // Logic mapping for the Staging UI
  const availableModes: ActionMode[] = ["convert"];
  const modeTargets: Partial<Record<ActionMode, string[]>> = {};

  if (category === "video") {
    availableModes.push("compress", "ai_extract");
    modeTargets.convert = ["MP4 (H.264)", "WebM (VP9)", "Animated GIF", "MP3 (Extract Audio)", "WAV (Extract Audio)", "MKV"];
    modeTargets.compress = ["High Quality (CRF 23)", "Medium Quality (CRF 28)", "Aggressive (CRF 32)", "Web Optimized (Faststart)"];
    modeTargets.ai_extract = ["Auto-Generated Subtitles (.srt)", "Plain Text Transcript (.txt)"];
  
  } else if (category === "audio") {
    availableModes.push("compress", "ai_extract");
    modeTargets.convert = ["MP3", "WAV", "OGG", "FLAC", "M4A"];
    modeTargets.compress = ["Voice / Podcast (64kbps)", "Standard Music (128kbps)", "High Quality Music (192kbps)", "Extreme Web Saver (32kbps)"];
    modeTargets.ai_extract = ["Text Transcript (.txt)", "Time-stamped JSON"];
  
  } else if (category === "image") {
    availableModes.push("compress", "ai_extract");
    modeTargets.convert = ["WebP", "PNG", "JPEG", "ICO", "BMP", "TIFF"];
    modeTargets.compress = ["High Quality (85%)", "Standard Web (60%)", "Extreme Compression (30%)"];
    modeTargets.ai_extract = ["OCR Text Extraction (.txt)"];
  
  } else if (category === "document") {
    availableModes.push("compress");
    modeTargets.convert = ["PDF to Word (.docx)", "Word to PDF (.pdf)", "Extract Raw Text (.txt)", "Markdown (.md)"];
    modeTargets.compress = ["PDF: Reduce Image DPI (150)", "PDF: Remove Hidden Metadata / Fonts", "DOCX: Strip Heavy Media"];
  
  } else if (category === "presentation") {
    availableModes.push("compress", "ai_extract");
    modeTargets.convert = ["Export to PDF", "Extract Raw Text (.txt)", "Export to Images (.png zip)"];
    modeTargets.compress = ["Downscale Embedded Media (150 DPI)", "Strip Notes & Metadata"];
    modeTargets.ai_extract = ["OCR Text Extraction on Slides"];

  } else if (category === "spreadsheet") {
    modeTargets.convert = ["CSV", "XLSX", "JSON (Data Array)", "HTML Table"];
  
  } else {
    modeTargets.convert = ["Force Binary Dump (.bin)"];
  }

  return {
    originalFile: file,
    category,
    extension,
    isHeavy,
    sizeMB,
    availableModes,
    modeTargets
  };
}
