import { PDFDocument } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from "docx";

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

  if (mode === "convert" || mode === "ai_extract") {
    // PDF Extraction Engine
    if (originalExt === "pdf") {
       // Dynamically import exclusively inside the Browser to prevent Next.js SSR crashes (DOMMatrix not defined)
       const pdfjsLib = await import("pdfjs-dist");
       pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

       const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
       const maxPages = pdf.numPages;
       
       let fullText = "";
       let pagesData = [];
       
       for (let i = 1; i <= maxPages; i++) {
         const page = await pdf.getPage(i);
         const content = await page.getTextContent();
         const strings = content.items.map((item: any) => item.str);
         fullText += strings.join(" ") + "\n\n";
         pagesData.push({ page: i, text: strings.join(" ") });
         onProgress(10 + Math.round((i / maxPages) * 40));
       }

       if (mode === "ai_extract") {
          if (tl.includes("json") || tl.includes("paginated")) {
             outputExtension = "json";
             finalBlob = new Blob([JSON.stringify(pagesData, null, 2)], { type: "application/json" });
          } else {
             outputExtension = "txt";
             finalBlob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
          }
       } else if (tl.includes("word") || tl.includes("docx")) {
          // Synthetic DOCX build using "docx" library
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
          // Basic markdown header mapping
          const mdText = `# Extracted Document\n\n${fullText}`;
          finalBlob = new Blob([mdText], { type: "text/markdown;charset=utf-8" });
       } else {
          // Default Text Extraction
          outputExtension = "txt";
          finalBlob = new Blob([fullText], { type: "text/plain;charset=utf-8" });
       }
    } else {
       outputExtension = "txt";
       finalBlob = new Blob(["Engine extraction unsupported for this non-PDF document type natively yet."], { type: "text/plain" });
    }
  } else if (mode === "compress") {
    // Compression via pdf-lib (stripping metadata, flattening, rebuilding stream)
    if (originalExt === "pdf") {
      onProgress(30);
      const pdfDoc = await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
      onProgress(50);
      
      // Remove generic metadata to strictly lower the byte weight
      pdfDoc.setTitle('');
      pdfDoc.setAuthor('');
      pdfDoc.setSubject('');
      pdfDoc.setKeywords([]);
      pdfDoc.setProducer('');
      pdfDoc.setCreator('');
      
      // Native save restructures and strips unused objects lowering weight natively
      const pdfBytes = await pdfDoc.save({ useObjectStreams: true }); 
      onProgress(90);
      
      finalBlob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
    } else {
      // Just passthrough
      finalBlob = new Blob([arrayBuffer as unknown as BlobPart]);
    }
  }

  onProgress(100);
  if (!finalBlob) finalBlob = new Blob([arrayBuffer as unknown as BlobPart]);
  
  return { url: URL.createObjectURL(finalBlob), extension: outputExtension };
} 
