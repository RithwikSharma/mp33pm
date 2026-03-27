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
    const sheetData = xlsxDynamic.utils.sheet_to_json(firstSheet, { header: 1, defval: "" }) as Array<Array<string | number | boolean>>;

    // Aggressive spreadsheet compression strips styling/formulas and normalizes to plain values.
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
