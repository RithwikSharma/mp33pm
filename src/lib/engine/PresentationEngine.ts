import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import { createExtractionPayload } from './extraction';
import { parseCompressionPreset } from '../pipeline/compressionTargets';

function resolvePartPath(baseDir: string, relativeTarget: string): string {
   const baseParts = baseDir.split('/').filter(Boolean);
   const targetParts = relativeTarget.split('/').filter(Boolean);
   const merged = [...baseParts];

   for (const part of targetParts) {
      if (part === '.') continue;
      if (part === '..') {
         merged.pop();
         continue;
      }
      merged.push(part);
   }

   return merged.join('/');
}

function parseSlideSize(xml: string): { width: number; height: number } {
   const m = xml.match(/<p:sldSz[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);
   if (!m) return { width: 960, height: 540 };
   const cx = parseInt(m[1], 10);
   const cy = parseInt(m[2], 10);
   // EMU -> points. 1 pt = 12700 EMU.
   return {
      width: Math.max(1, Math.round(cx / 12700)),
      height: Math.max(1, Math.round(cy / 12700)),
   };
}

type SlideImageRef = {
   rid: string;
   x?: number;
   y?: number;
   width?: number;
   height?: number;
};

function emuToPt(value?: number): number | undefined {
   if (typeof value !== "number" || Number.isNaN(value)) return undefined;
   return value / 12700;
}

function parseSlideImageRefs(slideXml: string): SlideImageRef[] {
   const refs: SlideImageRef[] = [];
   const picBlocks = slideXml.match(/<p:pic[\s\S]*?<\/p:pic>/g) || [];

   for (const block of picBlocks) {
      const ridMatch = block.match(/r:embed="([^"]+)"/);
      if (!ridMatch) continue;

      const offMatch = block.match(/<a:off[^>]*x="(\d+)"[^>]*y="(\d+)"/);
      const extMatch = block.match(/<a:ext[^>]*cx="(\d+)"[^>]*cy="(\d+)"/);

      refs.push({
         rid: ridMatch[1],
         x: emuToPt(offMatch ? parseInt(offMatch[1], 10) : undefined),
         y: emuToPt(offMatch ? parseInt(offMatch[2], 10) : undefined),
         width: emuToPt(extMatch ? parseInt(extMatch[1], 10) : undefined),
         height: emuToPt(extMatch ? parseInt(extMatch[2], 10) : undefined),
      });
   }

   return refs;
}

export async function processPresentation(
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
  let finalBlob: Blob = new Blob([arrayBuffer]);
  const tl = targetFormat.toLowerCase();

   onProgress(25);
   let zip: JSZip;
   try {
      zip = await JSZip.loadAsync(arrayBuffer);
   } catch {
      throw new Error("Unsupported presentation container. Please convert to PPTX first.");
   }

   // We require OpenXML presentation structure to process slides.
   if (!zip.files['ppt/presentation.xml']) {
      throw new Error("Unsupported presentation format. Only PPTX-compatible files are currently supported.");
   }
    
   // We scan slide XML for text and relationships for media to build local conversion outputs.
    let extractedText = "";
    let slideCount = 0;
   const slideTexts: string[] = [];
    
    const slideFiles = Object.keys(zip.files).filter(name => name.startsWith('ppt/slides/slide') && name.endsWith('.xml'));
    
    // Sort slides logically rather than alphabetically (slide1, slide2... not slide1, slide10)
    slideFiles.sort((a, b) => {
        const numA = parseInt(a.match(/slide(\d+)/)?.[1] || "0");
        const numB = parseInt(b.match(/slide(\d+)/)?.[1] || "0");
        return numA - numB;
    });

    for (let i = 0; i < slideFiles.length; i++) {
        const xmlContent = await zip.files[slideFiles[i]].async("text");
        
        // Use Regex to natively pull the Text run values from inside complex OpenXML <a:t> blocks
        const textMatches = xmlContent.match(/<a:t>([^<]+)<\/a:t>/g);
        let slideText = "";
        
        if (textMatches) {
            slideText = textMatches.map(tag => tag.replace(/<\/?a:t>/g, '')).join(" ");
        }
        
        if (slideText.trim().length > 0) {
           extractedText += `--- SLIDE ${i + 1} ---\n${slideText}\n\n`;
        }
        slideTexts.push(slideText.trim());
        
        slideCount++;
        onProgress(25 + Math.round(((i+1) / slideFiles.length) * 25));
    }

      const presentationXml = zip.files['ppt/presentation.xml'] ? await zip.files['ppt/presentation.xml'].async("text") : "";
      const slideSize = parseSlideSize(presentationXml);

      const getSlideImages = async (slideFile: string): Promise<Array<{ bytes: Uint8Array; ext: string; x?: number; y?: number; width?: number; height?: number }>> => {
         const relFile = slideFile
            .replace('ppt/slides/', 'ppt/slides/_rels/')
            .replace(/\.xml$/, '.xml.rels');

         const relEntry = zip.files[relFile];
         if (!relEntry) return [];
         const relXml = await relEntry.async("text");

         const relationMap = new Map<string, string>();
         const relRegex = /<Relationship[^>]*Id="([^"]+)"[^>]*Type="[^"]*\/image"[^>]*Target="([^"]+)"[^>]*\/?/g;
         let relMatch: RegExpExecArray | null;
         while ((relMatch = relRegex.exec(relXml)) !== null) {
            relationMap.set(relMatch[1], relMatch[2]);
         }

         const slideXml = await zip.files[slideFile].async("text");
         const refs = parseSlideImageRefs(slideXml);
         const results: Array<{ bytes: Uint8Array; ext: string; x?: number; y?: number; width?: number; height?: number }> = [];

         // If no picture blocks are found, fallback to any embedded image references.
         const fallbackRefs: SlideImageRef[] = refs.length > 0
            ? refs
            : Array.from(relationMap.keys()).map((rid) => ({ rid }));

         for (const ref of fallbackRefs) {
            const relationTarget = relationMap.get(ref.rid);
            if (!relationTarget) continue;

            const resolved = resolvePartPath('ppt/slides', relationTarget);
            const mediaEntry = zip.files[resolved];
            if (!mediaEntry) continue;

            const bytes = await mediaEntry.async("uint8array");
            const ext = resolved.split('.').pop()?.toLowerCase() || "";
            results.push({ bytes, ext, x: ref.x, y: ref.y, width: ref.width, height: ref.height });
         }

         return results;
      };

      if (mode === "convert") {
      if (tl.includes("pdf")) {
         outputExtension = "pdf";
             // Prefer slide images for fidelity; fallback to extracted text when no image is available.
         const pdfDoc = await PDFDocument.create();
         const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
         const fontSize = 12;
         const lineHeight = fontSize + 4;

             for (let i = 0; i < slideFiles.length; i++) {
                   const page = pdfDoc.addPage([slideSize.width, slideSize.height]);
                   const slideImages = await getSlideImages(slideFiles[i]);

                   if (slideImages.length > 0) {
                        for (const image of slideImages) {
                           if (!(image.ext === "png" || image.ext === "jpg" || image.ext === "jpeg")) continue;
                           const embedded = image.ext === "png"
                              ? await pdfDoc.embedPng(image.bytes)
                              : await pdfDoc.embedJpg(image.bytes);

                           const drawWidth = image.width && image.width > 1 ? image.width : embedded.width;
                           const drawHeight = image.height && image.height > 1 ? image.height : embedded.height;
                           const x = image.x ?? 0;
                           const yFromTop = image.y ?? 0;
                           const y = Math.max(0, page.getHeight() - yFromTop - drawHeight);

                           page.drawImage(embedded, {
                              x,
                              y,
                              width: Math.min(drawWidth, page.getWidth()),
                              height: Math.min(drawHeight, page.getHeight()),
                           });
                        }
                   } else {
                        let cursorY = page.getHeight() - 50;
                        const fallbackText = slideTexts[i] || `SLIDE ${i + 1}`;
                        for (const line of fallbackText.split(/\r?\n/)) {
                           const safeLine = line.substring(0, 100);
                           if (safeLine.trim().length > 0) {
                              page.drawText(safeLine, { x: 50, y: cursorY, size: fontSize, font: defaultFont, color: rgb(0, 0, 0) });
                              cursorY -= lineHeight;
                           }
                        }
                   }

                   onProgress(60 + Math.round(((i + 1) / Math.max(1, slideFiles.length)) * 25));
         }

         const pdfBytes = await pdfDoc.save();
         finalBlob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
         onProgress(85);
      } else if (tl.includes("word") || tl.includes("docx")) {
         outputExtension = "docx";
         const doc = new Document({
            sections: [{
              properties: {},
              children: extractedText.split('\n\n').map(p => new Paragraph({ children: [new TextRun(p)] }))
            }]
         });
         const docxBuffer = await Packer.toBlob(doc);
         finalBlob = docxBuffer;
         onProgress(85);
      } else if (tl.includes("txt")) {
         outputExtension = "txt";
         finalBlob = new Blob([extractedText], { type: "text/plain" });
      }
      } else if (mode === "ai_extract") {
          if (tl.includes("json") || tl.includes("structured")) {
             outputExtension = "json";
             const segments = extractedText
                .split("--- SLIDE ")
                .filter(Boolean)
                .map((entry, index) => {
                   const clean = entry.replace(/^\d+ ---\n?/, "").trim();
                   return {
                      id: `slide-${index + 1}`,
                      kind: "slide" as const,
                      text: clean,
                      source: { slide: index + 1 },
                   };
                });
             const payload = createExtractionPayload({
                engine: "presentation",
                sourceExtension: originalExt,
                rawText: extractedText,
                segments,
                metadata: {
                   slides: slideCount,
                },
             });
             finalBlob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
          } else {
             outputExtension = "txt";
             finalBlob = new Blob([extractedText], { type: "text/plain;charset=utf-8" });
          }
      } else if (mode === "compress") {
        // Smart image compression while preserving presentation structure and layout
        onProgress(40);
        
        const mediaFolders = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/'));
        const preset = parseCompressionPreset(targetFormat);
        
        // Define quality levels based on compression preset
        // Instead of deleting, intelligently compress images
        const qualityMap: Record<number, number> = {
          80: 0.85,  // 80% - high quality, minimal compression
          50: 0.65,  // 50% - balanced quality and size
          30: 0.45,  // 30% - aggressive compression but still visible
          20: 0.30,  // 20% - maximum compression
        };
        
        const targetQuality = qualityMap[preset] || 0.65;
        
        // Process each image - compress instead of delete
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
            // If compression fails, keep original to preserve presentation integrity
            console.warn(`[PresentationEngine] Failed to compress ${filePath}, keeping original:`, error);
          }
        }
        
        onProgress(70);
        
        // Recompress the ZIP with optimal compression level
        const zipLevel = preset <= 30 ? 9 : preset <= 50 ? 8 : 6;
        const newZipBlob = await zip.generateAsync({
          type: "blob",
          compression: "DEFLATE",
          compressionOptions: { level: zipLevel }
        });
        
        finalBlob = newZipBlob;
        outputExtension = "pptx";
        onProgress(90);
      }
  

  onProgress(100);
  return { url: URL.createObjectURL(finalBlob), extension: outputExtension };
}
