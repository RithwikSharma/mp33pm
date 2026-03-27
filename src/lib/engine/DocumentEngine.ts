import { PDFDocument, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from "docx";
import mammoth from "mammoth";
import { createExtractionPayload } from "./extraction";
import { parseCompressionPreset } from "../pipeline/compressionTargets";

export async function processDocument(
  taskId: string,
  actualFile: File,
  originalExt: string,
  mode: string,
  targetFormat: string,
  onProgress: (progress: number) => void
): Promise<{ url: string; extension: string }> {

  let outputExtension = originalExt;
  let finalBlob: Blob | null = null;
  const tl = targetFormat.toLowerCase();
  
  onProgress(10);
  const arrayBuffer = await actualFile.arrayBuffer();
  const textDecoder = new TextDecoder("utf-8");

  const extractDocumentText = async () => {
    if (originalExt === "pdf") {
      const pdfjsLib = await import("pdfjs-dist");
      // Resolve worker locally from /public so no remote fetch or fake-worker setup is required.
      pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
      const maxPages = pdf.numPages;

      let fullText = "";
      const pagesData: { page: number; text: string }[] = [];

      for (let i = 1; i <= maxPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items
          .map((item) => (item as { str?: string }).str || "")
          .filter(Boolean);
        const pageText = strings.join(" ");
        fullText += pageText + "\n\n";
        pagesData.push({ page: i, text: pageText });
        onProgress(10 + Math.round((i / maxPages) * 40));
      }

      return { fullText, pagesData };
    }

    if (originalExt === "docx") {
      const result = await mammoth.extractRawText({ arrayBuffer });
      const lines = result.value.split(/\r?\n/).filter(Boolean);
      return {
        fullText: result.value,
        pagesData: lines.map((line, index) => ({ page: index + 1, text: line })),
      };
    }

    if (["txt", "md", "rtf", "doc"].includes(originalExt)) {
      const fullText = textDecoder.decode(arrayBuffer);
      const lines = fullText.split(/\r?\n/).filter(Boolean);
      return {
        fullText,
        pagesData: lines.map((line, index) => ({ page: index + 1, text: line })),
      };
    }

    return {
      fullText: "",
      pagesData: [],
    };
  };

  if (mode === "convert" || mode === "ai_extract") {
    const { fullText, pagesData } = await extractDocumentText();

    if (mode === "ai_extract") {
      if (tl.includes("json") || tl.includes("structured") || tl.includes("paginated")) {
        outputExtension = "json";
        const payload = createExtractionPayload({
          engine: "document",
          sourceExtension: originalExt,
          rawText: fullText,
          segments: pagesData.map((entry) => ({
            id: `page-${entry.page}`,
            kind: "page",
            text: entry.text,
            source: { page: entry.page },
          })),
          metadata: {
            segmentCount: pagesData.length,
          },
        });
        finalBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      } else {
        outputExtension = "txt";
        finalBlob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
      }
    } else if (tl.includes("word") || tl.includes("docx")) {
      outputExtension = "docx";
      const doc = new Document({
        sections: [{
          properties: {},
          children: fullText.split('\n\n').map(paragraph => new Paragraph({
            children: [new TextRun(paragraph)]
          }))
        }]
      });
      onProgress(75);
      const docxBuffer = await Packer.toBlob(doc);
      finalBlob = docxBuffer;
    } else if (tl.includes("markdown") || tl.includes("md")) {
      outputExtension = "md";
      const mdText = `# Extracted Document\n\n${fullText}`;
      finalBlob = new Blob([mdText], { type: "text/markdown;charset=utf-8" });
    } else if (tl.includes("pdf")) {
      outputExtension = "pdf";
      const pdfDoc = await PDFDocument.create();
      let currentPage = pdfDoc.addPage();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const lines = fullText.split(/\r?\n/).filter(Boolean);
      let cursorY = currentPage.getHeight() - 50;

      for (const line of lines) {
        if (cursorY < 40) {
          currentPage = pdfDoc.addPage();
          cursorY = currentPage.getHeight() - 50;
        }
        currentPage.drawText(line.slice(0, 95), { x: 40, y: cursorY, size: 11, font });
        cursorY -= 15;
      }

      finalBlob = new Blob([await pdfDoc.save() as unknown as BlobPart], { type: "application/pdf" });
    } else {
      outputExtension = "txt";
      finalBlob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
    }
  } else if (mode === "compress") {
    // Compression via pdf-lib (stripping metadata, flattening, rebuilding stream)
    if (originalExt === "pdf") {
      onProgress(30);
      try {
        const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
        onProgress(50);

        // Metadata stripping is generally safe. Keep save options conservative to preserve embedded images.
        pdfDoc.setTitle("");
        pdfDoc.setAuthor("");
        pdfDoc.setSubject("");
        pdfDoc.setKeywords([]);
        pdfDoc.setProducer("");
        pdfDoc.setCreator("");
        parseCompressionPreset(targetFormat); // Keep preset parsing for future quality tiers.

        const pdfBytes = await pdfDoc.save({
          useObjectStreams: false,
          updateFieldAppearances: false,
        });
        onProgress(90);

        finalBlob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
        outputExtension = "pdf";
      } catch (error) {
        console.warn("[DocumentEngine] Safe PDF compression fallback triggered:", error);
        finalBlob = new Blob([arrayBuffer as unknown as BlobPart], { type: "application/pdf" });
        outputExtension = "pdf";
      }
    } else if (originalExt === "docx") {
      // DOCX local compression strategy: rehydrate to plain text and rebuild a minimal document.
      const result = await mammoth.extractRawText({ arrayBuffer });
      const compactDoc = new Document({
        sections: [{
          properties: {},
          children: result.value.split(/\r?\n/).filter(Boolean).map((line) => new Paragraph({
            children: [new TextRun(line)],
          })),
        }],
      });
      finalBlob = await Packer.toBlob(compactDoc);
      outputExtension = "docx";
    } else {
      // Text-like documents compress best as plain UTF-8 text.
      outputExtension = "txt";
      finalBlob = new Blob([textDecoder.decode(arrayBuffer)], { type: "text/plain;charset=utf-8" });
    }
  }

  onProgress(100);
  if (!finalBlob) finalBlob = new Blob([arrayBuffer as unknown as BlobPart]);
  
  return { url: URL.createObjectURL(finalBlob), extension: outputExtension };
} 
