import * as xlsx from "xlsx";

export async function processSpreadsheet(
  taskId: string,
  actualFile: File,
  originalExt: string,
  mode: string,
  targetFormat: string,
  onProgress: (progress: number) => void
): Promise<{ url: string; extension: string }> {
  
  onProgress(10);
  const arrayBuffer = await actualFile.arrayBuffer();
  
  onProgress(30);
  // Parse the workbook. SheetJS operates purely in memory locally.
  const workbook = xlsx.read(arrayBuffer, { type: "array" });
  
  onProgress(60);
  let outputExtension = originalExt;
  let resultData: Uint8Array | string = "";

  const tl = targetFormat.toLowerCase();

  // Grab the first sheet for flat exports
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];

  if (mode === "convert") {
    if (tl.includes("csv")) {
      outputExtension = "csv";
      resultData = xlsx.utils.sheet_to_csv(firstSheet);
    } else if (tl.includes("json")) {
      outputExtension = "json";
      resultData = JSON.stringify(xlsx.utils.sheet_to_json(firstSheet), null, 2);
    } else if (tl.includes("html")) {
      outputExtension = "html";
      resultData = xlsx.utils.sheet_to_html(firstSheet);
    } else {
      outputExtension = "xlsx";
      resultData = xlsx.write(workbook, { bookType: "xlsx", type: "array" });
    }
  } else if (mode === "compress") {
    // "Compressing" a spreadsheet natively strips out unnecessary cache/metadata 
    // simply by rewriting the core data structures natively into a fresh container.
    outputExtension = "xlsx";
    resultData = xlsx.write(workbook, { bookType: "xlsx", type: "array" });
  }

  onProgress(90);

  let blob: Blob;
  if (typeof resultData === "string") {
    blob = new Blob([resultData as unknown as BlobPart], { type: "text/plain;charset=utf-8" });
  } else {
    blob = new Blob([resultData as unknown as BlobPart], { type: "application/octet-stream" });
  }

  onProgress(100);
  return { url: URL.createObjectURL(blob), extension: outputExtension };
} 
