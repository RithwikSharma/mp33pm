// src/lib/engine/ImageEngine.ts

import { PDFDocument } from 'pdf-lib';
import { parseCompressionPreset } from '../pipeline/compressionTargets';

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
  let finalBlob: Blob;

  const tl = targetFormat.toLowerCase();

  if (mode === "convert") {
     onProgress(50);
     
     if (tl.includes("pdf")) {
         outputExtension = "pdf";
         const pdfDoc = await PDFDocument.create();
         const page = pdfDoc.addPage([canvas.width, canvas.height]);
         
         // Use lossless conversion to PDF to maintain image quality
         const imgData = canvas.toDataURL('image/png', 1.0);
         const imgBytes = await fetch(imgData).then(res => res.arrayBuffer());
         
         const pdfImage = await pdfDoc.embedPng(imgBytes);
         page.drawImage(pdfImage, { x: 0, y: 0, width: canvas.width, height: canvas.height });
         
         const pdfBytes = await pdfDoc.save();
         finalBlob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
     } else if (tl.includes("webp")) {
         outputExtension = "webp";
         // For conversion to WebP, use high quality to preserve original
         finalBlob = await new Promise<Blob>((resolve) => {
             canvas.toBlob((blob) => resolve(blob || new Blob([])), "image/webp", 0.95);
         });
     } else {
         const mimeType = "image/" + (tl.includes("jpg") || tl.includes("jpeg") ? "jpeg" : tl.replace(/[^a-z]/g, ""));
         outputExtension = mimeType.split('/')[1] || "png";
         
         // For conversion, prioritize quality (use high quality parameter)
         const quality = tl.includes("jpg") || tl.includes("jpeg") ? 0.95 : 1.0;
         finalBlob = await new Promise<Blob>((resolve) => {
             canvas.toBlob((blob) => resolve(blob || new Blob([])), mimeType, quality);
         });
     }
  } else if (mode === "compress") {
     onProgress(50);
     
     const preset = parseCompressionPreset(targetFormat);
     
     // Map compression presets to quality levels
     // Higher quality ensures visual fidelity while still reducing file size
     const qualityMap: Record<number, number> = {
       80: 0.85,  // 80% - minimal compression, high quality
       50: 0.70,  // 50% - balanced compression
       30: 0.50,  // 30% - aggressive compression but still acceptable
       20: 0.35,  // 20% - maximum compression
     };
     
     const quality = qualityMap[preset] || 0.70;
     
     // Choose output format based on image type and compression goals
     // PNG is lossless (poor compression), JPEG is lossy (good compression)
     // WebP is superior to both in modern browsers
     
     if (originalExt === 'png' || !tl.includes('jpg') && !tl.includes('jpeg')) {
       // For PNG or when not specifying format, use WebP for best compression
       outputExtension = "webp";
       finalBlob = await new Promise<Blob>((resolve) => {
           canvas.toBlob((blob) => resolve(blob || new Blob([])), "image/webp", quality);
       });
     } else {
       // For JPEG input, maintain format
       outputExtension = "jpg";
       finalBlob = await new Promise<Blob>((resolve) => {
           canvas.toBlob((blob) => resolve(blob || new Blob([])), "image/jpeg", quality);
       });
     }
  }

  onProgress(85);

  onProgress(100);
  URL.revokeObjectURL(imageUrl); // Free memory buffer

  return { url: URL.createObjectURL(finalBlob!), extension: outputExtension };
}
