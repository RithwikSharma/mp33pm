// src/lib/engine/ImageEngine.ts

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

  if (mode === "convert") {
    if (tl.includes("webp")) { outputExtension = "webp"; mimeType = "image/webp"; }
    else if (tl.includes("jpeg") || tl.includes("jpg")) { outputExtension = "jpg"; mimeType = "image/jpeg"; }
    else if (tl.includes("png")) { outputExtension = "png"; mimeType = "image/png"; }
  } else if (mode === "compress") {
    // Determine compression scale dynamically based on generic percentage tier input mapping
    mimeType = "image/jpeg"; // Compression requires lossy container natively
    outputExtension = "jpg";

    if (tl.includes("70%")) qualitySetting = 0.8;
    else if (tl.includes("40%")) qualitySetting = 0.5;
    else if (tl.includes("15%")) qualitySetting = 0.2;
    else if (tl.includes("5%")) qualitySetting = 0.05;

    // Rescale image dimensions for strong & extreme compressions
    if (tl.includes("15%")) { canvas.width *= 0.6; canvas.height *= 0.6; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); }
    if (tl.includes("5%")) { canvas.width *= 0.3; canvas.height *= 0.3; ctx.drawImage(img, 0, 0, canvas.width, canvas.height); }
  }

  onProgress(85);

  const blob: Blob = await new Promise((resolve) => {
    canvas.toBlob((b) => resolve(b as Blob), mimeType, qualitySetting);
  });

  onProgress(100);
  URL.revokeObjectURL(imageUrl); // Free memory buffer

  return { url: URL.createObjectURL(blob), extension: outputExtension };
}
