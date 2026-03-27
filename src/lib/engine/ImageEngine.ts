// src/lib/engine/ImageEngine.ts

import { PDFDocument } from 'pdf-lib';

export async function processImage(
  taskId: string,
  actualFile: File,
  originalExt: string,
  mode: string,
  targetFormat: string,
  onProgress: (progress: number) => void
): Promise<{ url: string; extension: string }> {

  onProgress(10);
  
  // Transform file into image rendering stream
  const imageUrl = URL.createObjectURL(actualFile);
  const img = new Image();
  
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = reject;
    img.src = imageUrl;
  });

  onProgress(40);

  const canvas = document.createElement("canvas");
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to initialize Canvas context for image manipulation.");

  // Draw image locally
  ctx.drawImage(img, 0, 0);

  onProgress(60);

  let outputExtension = originalExt;
  let mimeType = actualFile.type || "image/png";
  let qualitySetting = 0.92; // default high quality

  const tl = targetFormat.toLowerCase();
  let finalBlob: Blob;

  if (mode === "convert") {
     onProgress(50);
     
     if (tl.includes("pdf")) {
         outputExtension = "pdf";
         const pdfDoc = await PDFDocument.create();
         const page = pdfDoc.addPage([canvas.width, canvas.height]);
         
         const imgData = canvas.toDataURL('image/jpeg', 1.0);
         const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
         
         const pdfImage = await pdfDoc.embedJpg(imgBytes);
         page.drawImage(pdfImage, { x: 0, y: 0, width: canvas.width, height: canvas.height });
         
         const pdfBytes = await pdfDoc.save();
         finalBlob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
     } else {
         const mimeType = "image/" + (tl.includes("jpg") || tl.includes("jpeg") ? "jpeg" : tl.replace(/[^a-z]/g, ""));
         outputExtension = mimeType.split('/')[1] || "png";
         
         finalBlob = await new Promise<Blob>((resolve) => {
             canvas.toBlob((blob) => resolve(blob || new Blob([])), mimeType, 1.0);
         });
     }
  } else if (mode === "compress") {
     onProgress(50);
     let quality = 0.8;
     
     if (tl.includes("80%")) quality = 0.8;
     if (tl.includes("50%")) quality = 0.5;
     if (tl.includes("30%")) quality = 0.3;
     if (tl.includes("20%")) quality = 0.2;
     
     // WebP compression scales incredibly accurately natively on Canvas
     outputExtension = "webp";
     finalBlob = await new Promise<Blob>((resolve) => {
         canvas.toBlob((blob) => resolve(blob || new Blob([])), "image/webp", quality);
     });
  }

  onProgress(85);

  onProgress(100);
  URL.revokeObjectURL(imageUrl); // Free memory buffer

  return { url: URL.createObjectURL(finalBlob!), extension: outputExtension };
}
