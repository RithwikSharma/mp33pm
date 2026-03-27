import JSZip from 'jszip';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Document, Packer, Paragraph, TextRun } from 'docx';

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

  // ONLY PPTX is reliably parsable locally via Zip. 
  if (originalExt === "pptx") {
    onProgress(25);
    const zip = await JSZip.loadAsync(arrayBuffer);
    
    // We must manually scan the presentation layers to rip out text since offline visual rendering is impossible
    let extractedText = "";
    let slideCount = 0;
    
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
        
        slideCount++;
        onProgress(25 + Math.round(((i+1) / slideFiles.length) * 25));
    }

    if (mode === "convert") {
      if (tl.includes("pdf")) {
         outputExtension = "pdf";
         // We construct a Data PDF. The graphical layers are stripped to satisfy offline serverless constraints.
         const pdfDoc = await PDFDocument.create();
         
         // Split the text manually to wrap
         const lines = extractedText.split('\n');
         let page = pdfDoc.addPage();
         const defaultFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
         const fontSize = 12;
         const lineHeight = fontSize + 4;
         let cursorY = page.getHeight() - 50;
         
         for(let line of lines) {
             if (cursorY < 50) {
                 page = pdfDoc.addPage();
                 cursorY = page.getHeight() - 50;
             }
             // Very basic bounds bypass for super long strings. This is a fallback purely for Text -> PDF
             const safeLine = line.substring(0, 100); 
             if (safeLine.trim().length > 0) {
                page.drawText(safeLine, { x: 50, y: cursorY, size: fontSize, font: defaultFont, color: rgb(0,0,0) });
             }
             cursorY -= lineHeight;
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
    } else if (mode === "compress") {
       // Compression natively on an XML Container Zip means erasing internal media / stripping bloat
       // We can iterate the zip and delete massive images inside ppt/media
       onProgress(40);
       const mediaFolders = Object.keys(zip.files).filter(name => name.startsWith('ppt/media/'));
       
       if (tl.includes("15%") || tl.includes("5%")) {
           // Extreme formatting explicitly strips all graphical bloat out of the Powerpoint Zip!
           for (let file of mediaFolders) { zip.remove(file); }
       }
       
       onProgress(70);
       const newZipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });
       finalBlob = newZipBlob;
       onProgress(90);
    }
  }

  onProgress(100);
  return { url: URL.createObjectURL(finalBlob), extension: outputExtension };
}
