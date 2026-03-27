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

  // Helper formatter for the dynamic Compression UX
  const formatSize = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
    if (mb < 1) return `${Math.round(mb * 1024)} KB`;
    return `${Math.round(mb)} MB`;
  };

  // Dynamic Logic mapping targets for the Staging UI
  const generateDynamicCompressionTargets = (mb: number) => [
    `80% (${formatSize(mb * 0.8)})`,
    `50% (${formatSize(mb * 0.5)})`,
    `30% (${formatSize(mb * 0.3)})`,
    `20% (${formatSize(mb * 0.2)})`
  ];

  // Logic mapping for the Staging UI
  const availableModes: ActionMode[] = ["convert"];
  const modeTargets: Partial<Record<ActionMode, string[]>> = {};

  if (category === "video") {
    availableModes.push("compress", "ai_extract");
    modeTargets.convert = ["MP4", "WebM", "GIF", "MKV", "MP3 (Audio)", "WAV (Audio)"];
    modeTargets.compress = generateDynamicCompressionTargets(sizeMB);
    modeTargets.ai_extract = ["Subtitles (.srt)", "Transcript (.txt)", "Timestamped JSON Array (.json)"];
  
  } else if (category === "audio") {
    availableModes.push("compress", "ai_extract");
    modeTargets.convert = ["MP3", "WAV", "OGG", "FLAC", "M4A"];
    modeTargets.compress = generateDynamicCompressionTargets(sizeMB);
    modeTargets.ai_extract = ["Transcript (.txt)", "Timestamped JSON Array (.json)"];
  
  } else if (category === "image") {
    availableModes.push("compress", "ai_extract"); 
    modeTargets.convert = ["WebP", "PNG", "JPEG", "ICO", "BMP", "TIFF"];
    modeTargets.compress = generateDynamicCompressionTargets(sizeMB);
    modeTargets.ai_extract = ["OCR Text Transcript (.txt)", "OCR Bounding Boxes (.json)"];
  
  } else if (category === "document") {
    availableModes.push("compress", "ai_extract");
    modeTargets.convert = ["PDF to Word (.docx)", "Extract Raw Text (.txt)", "Markdown (.md)"];
    modeTargets.compress = generateDynamicCompressionTargets(sizeMB);
    modeTargets.ai_extract = ["Raw Text Transcript (.txt)", "Paginated Data (.json)"];
  
  } else if (category === "presentation") {
    availableModes.push("compress", "ai_extract");
    modeTargets.convert = ["PDF Document (.pdf)", "Word Document (.docx)", "Raw Text (.txt)"];
    modeTargets.compress = generateDynamicCompressionTargets(sizeMB);
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
