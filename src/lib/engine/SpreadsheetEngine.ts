import JSZip from 'jszip';
import { parseCompressionPreset } from "../pipeline/compressionTargets";
import { createExtractionPayload } from "./extraction";

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
  
  let outputExtension = originalExt;
  let resultData: Uint8Array | string = "";
  let finalBlob: Blob | null = null;
  const tl = targetFormat.toLowerCase();

  onProgress(30);
  const xlsxDynamic = await import("xlsx");
  const workbook = xlsxDynamic.read(arrayBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  const firstSheet = workbook.Sheets[firstSheetName];

  if (mode === "convert" || mode === "ai_extract") {
    if (mode === "ai_extract") {
      const rowArrays = workbook.SheetNames.flatMap((sheetName) => {
        const sheet = workbook.Sheets[sheetName];
        const rows = xlsxDynamic.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as Array<Array<string | number | boolean>>;
        return rows.map((cells, rowIndex) => ({ sheetName, rowIndex: rowIndex + 1, cells }));
      });

      const rawText = rowArrays
        .map((row) => `${row.sheetName}#${row.rowIndex}: ${row.cells.join(" | ")}`)
        .join("\n");

      if (tl.includes("json") || tl.includes("structured")) {
        outputExtension = "json";
        const payload = createExtractionPayload({
          engine: "spreadsheet",
          sourceExtension: originalExt,
          rawText,
          segments: rowArrays.map((row) => ({
            id: `${row.sheetName}-row-${row.rowIndex}`,
            kind: "row",
            text: row.cells.join(" | "),
            source: {
              sheet: row.sheetName,
              row: row.rowIndex,
            },
          })),
          metadata: {
            sheets: workbook.SheetNames.length,
            rows: rowArrays.length,
          },
        });
        resultData = JSON.stringify(payload, null, 2);
      } else {
        outputExtension = "txt";
        resultData = rawText;
      }
    } else if (tl.includes("csv")) {
      outputExtension = "csv";
      resultData = xlsxDynamic.utils.sheet_to_csv(firstSheet);
    } else if (tl.includes("json")) {
      outputExtension = "json";
      resultData = JSON.stringify(xlsxDynamic.utils.sheet_to_json(firstSheet), null, 2);
    } else if (tl.includes("html")) {
      outputExtension = "html";
      resultData = xlsxDynamic.utils.sheet_to_html(firstSheet);
    } else {
      outputExtension = "xlsx";
      resultData = xlsxDynamic.write(workbook, { bookType: "xlsx", type: "array" });
    }
  } else if (mode === "compress") {
    const preset = parseCompressionPreset(targetFormat);

    // For XLSX, preserve embedded images and structure while compressing
    if (originalExt === "xlsx") {
      onProgress(40);
      
      try {
        const zip = await JSZip.loadAsync(arrayBuffer);
        
        // Find all media files (images, charts) in the spreadsheet
        const mediaFolders = Object.keys(zip.files).filter(name => name.startsWith('xl/media/'));
        
        // Define quality levels based on compression preset
        const qualityMap: Record<number, number> = {
          80: 0.85,  // 80% - high quality, minimal compression
          50: 0.65,  // 50% - balanced quality and size
          30: 0.45,  // 30% - aggressive compression but still visible
          20: 0.30,  // 20% - maximum compression
        };
        
        const targetQuality = qualityMap[preset] || 0.65;
        
        // Compress embedded images instead of losing them
        for (const filePath of mediaFolders) {
          try {
            const file = zip.files[filePath];
            const bytes = await file.async("uint8array");
            const ext = filePath.split('.').pop()?.toLowerCase() || "";
            
            // Only process JPEG and PNG images; skip SVG and other formats
            if (!['jpg', 'jpeg', 'png'].includes(ext)) continue;
            
            // Create canvas for compression
            const blob = new Blob([bytes]);
            const imgUrl = URL.createObjectURL(blob);
            
            const img = new Image();
            await new Promise<void>((resolve, reject) => {
              img.onload = () => resolve();
              img.onerror = () => reject(new Error(`Failed to load image: ${filePath}`));
              img.src = imgUrl;
            });
            
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            if (!ctx) {
              URL.revokeObjectURL(imgUrl);
              continue;
            }
            
            ctx.drawImage(img, 0, 0);
            URL.revokeObjectURL(imgUrl);
            
            // Compress to JPEG with quality setting
            const compressedBlob = await new Promise<Blob>((resolve) => {
              canvas.toBlob(
                (blob) => resolve(blob || new Blob([])),
                'image/jpeg',
                targetQuality
              );
            });
            
            const compressedBytes = await compressedBlob.arrayBuffer();
            zip.file(filePath.replace(/\.(png|jpg|jpeg)$/i, '.jpg'), compressedBytes);
            zip.remove(filePath); // Remove original
            
          } catch (error) {
            // If compression fails, keep original to preserve spreadsheet integrity
            console.warn(`[SpreadsheetEngine] Failed to compress ${filePath}, keeping original:`, error);
          }
        }
        
        onProgress(70);
        
        // Recompress the ZIP with optimal compression level
        const zipLevel = preset <= 30 ? 9 : preset <= 50 ? 8 : 6;
        const compressedZip = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: zipLevel }
        });
        
        finalBlob = compressedZip;
        outputExtension = "xlsx";
        onProgress(90);
      } catch (error) {
        console.warn("[SpreadsheetEngine] XLSX structural compression failed, using data-only compression:", error);
        // Fallback to data-only compression if ZIP processing fails
        const sheetData = xlsxDynamic.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as Array<Array<string | number | boolean>>;
        const normalizedRows = sheetData.map((row) => row.map((cell) => {
          if (typeof cell === "number") return Number(cell.toFixed(preset <= 30 ? 1 : 3));
          if (typeof cell === "string") return preset <= 20 ? cell.slice(0, 256) : cell;
          return cell;
        }));
        
        outputExtension = "xlsx";
        const minimalWb = xlsxDynamic.utils.book_new();
        const minimalSheet = xlsxDynamic.utils.aoa_to_sheet(normalizedRows);
        xlsxDynamic.utils.book_append_sheet(minimalWb, minimalSheet, firstSheetName || "Sheet1");
        resultData = xlsxDynamic.write(minimalWb, { bookType: "xlsx", type: "array", compression: true });
        onProgress(90);
      }
    } else {
      // Non-XLSX formats: extract data and compress as text
      const sheetData = xlsxDynamic.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as Array<Array<string | number | boolean>>;

      const normalizedRows = sheetData.map((row) => row.map((cell) => {
        if (typeof cell === "number") return Number(cell.toFixed(preset <= 30 ? 1 : 3));
        if (typeof cell === "string") return preset <= 20 ? cell.slice(0, 256) : cell;
        return cell;
      }));

      if (preset <= 30) {
        outputExtension = "csv";
        const rebuiltSheet = xlsxDynamic.utils.aoa_to_sheet(normalizedRows);
        resultData = xlsxDynamic.utils.sheet_to_csv(rebuiltSheet);
      } else {
        outputExtension = "xlsx";
        const minimalWb = xlsxDynamic.utils.book_new();
        const minimalSheet = xlsxDynamic.utils.aoa_to_sheet(normalizedRows);
        xlsxDynamic.utils.book_append_sheet(minimalWb, minimalSheet, firstSheetName || "Sheet1");
        resultData = xlsxDynamic.write(minimalWb, { bookType: "xlsx", type: "array", compression: true });
      }
    }
  }

  onProgress(90);

  let blob: Blob;
  
  if (finalBlob) {
    // Use finalBlob if created during compression
    blob = finalBlob;
  } else if (typeof resultData === "string") {
    blob = new Blob([resultData as unknown as BlobPart], { type: "text/plain;charset=utf-8" });
  } else {
    blob = new Blob([resultData as unknown as BlobPart], { type: "application/octet-stream" });
  }

  onProgress(100);
  return { url: URL.createObjectURL(blob), extension: outputExtension };
} 
