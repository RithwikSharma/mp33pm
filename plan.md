# Implementation Plan: Phase 6 (Universal Testing, Perfect Compression Math, & Premium UI Overhaul)

You're demanding a highly professional, exhaustively robust system—and I will deliver. Here is the meticulous plan to enforce exact compression mathematics, expand universal extraction capabilities, execute comprehensive engine verification, and completely overhaul the "AI-generated" UI aesthetic.

## 1. Perfecting the Compression Mathematics 
Instead of rough scalar estimates, we will inject a pre-calculation parsing layer to hit your exact `MB` percentage demands mathematically:
- **Audio/Video**: We will execute a dummy `ffmpeg -i` command invisibly before compressing to intercept the hidden `Duration` string logged by the WebAssembly framework. We will use the physical duration (in seconds) against your requested `MB` percentage target to dynamically calculate the precise `-b:v` (Video Bitrate) and `-b:a` (Audio Bitrate) needed to **force the output file directly down to the target Byte size**.
- **Images**: We will natively calculate the `quality` parameter scaling coefficient on the HTML5 Canvas exporter relative to your % limits.
- **Documents/Presentations**: Since PDFs and PPTXs contain fixed binary image wrappers that Javascript cannot easily rescale entirely without visual ML logic, we will enforce aggressive structural zip-stripping (flattening unused objects, discarding media chunks) to squash the files as tight as technically possible without backend API assistance.

## 2. Universal Extraction & Conversion
We will bridge the final remaining isolated format gaps to ensure "every file type" is comprehensively addressed:
- **Spreadsheets (`.xlsx`, `.csv`)**: We will construct `ai_extract` targets to allow data extraction into paginated and timestamp-equivalent flat JSON array structures mapping the exact rows/columns natively.
- **Word Documents (`.docx`)**: We will install `mammoth.js` to natively decode the Microsoft XML format to allow extracting pure `.txt` and JSON structural mappings directly from Word documents.
- **Visuals**: We will actively allow mapping Images to `.pdf` wrappers natively inside the browser via `pdf-lib`.

## 3. The Comprehensive Verification Matrix
Once the mathematical and conversion updates are written, I will put on my QA Manager hat: 
- I will logically map execution sequences across ALL 5 engines (Media, Spreadsheet, Image, Document, Presentation) checking `Convert`, `Compress`, and `AI Extract`.
- For compression, I will verify the arithmetic bounds of our newly defined Wasm bitrates against the duration parsing to ensure the % scaling guarantees hold true.

## 4. Premium UI Overhaul
To ditch the "AI-generated" glowing glassmorphism neon aesthetic you're currently seeing:
- **Aesthetic**: We will strip back the neon gradients and heavy frosted glass. I will implement a highly premium, Vercel-like, minimalist monochromatic design system (crisp typography, subtle 1px structural borders, extremely muted hover states, and professional grid layouts).
- **Usability**: We will consolidate the Staging tables to look like a clean, professional software dashboard rather than a flashy landing page.

## User Review Required

> [!CAUTION]
> 1. Re-calculating target sizes dynamically mathematically means if you compress an extremely high-quality MP4 or WAV lightly natively (e.g., 200MB ➔ 10MB target), FFmpeg will absolutely honor your demand by choking the video/audio bitrate down so severely that the output stream will look and sound like incredibly pixelated blocky garbage. **Mathematically accurate sizes firmly guarantee extreme quality loss if pushed to tiny limits.**
> 
> Are you perfectly fine with enforcing this strict mathematical byte-target logic over default VBR algorithms, and do you approve the minimalist UI aesthetic redesign? If so, Phase 6 execution and verification begins!
