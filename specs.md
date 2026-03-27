# Project: mp33pm (Master Specification)

## Core Philosophy
mp33pm is the ultimate "Zero-Server" all-in-one file utility platform. All processing is 100% Client-Side (Edge) with absolutely no data ever leaving the browser or stored on external servers.
- **Unlimited & Smart**: No file size caps. The app limits and scales dynamically based on local hardware, actively preventing crashes using intelligent chunking and selective processing.
- **Privacy Core**: Everything runs locally. Caching (if any) is confined to local high-performance storage like OPFS (Origin Private File System) or IndexedDB.
- **Aesthetic Excellence**: The UI must be highly pleasing, visually striking, user-friendly, and symmetrical reflecting the 'mp33pm' palindrome.

## Technical Stack
- **Frontend**: Next.js 15+ (App Router), Tailwind CSS v4, Framer Motion (for liquid-smooth, pleasant UX).
- **Processing Engines (WebAssembly & JS)**:
  - Audio/Video: FFmpeg.wasm (Multithreaded).
  - Documents & Spreadsheets: SheetJS (Excel), Mammoth.js (Word), pdf-lib / pdf.js (PDFs).
  - Transcription: Whisper.wasm / Transformers.js for AI-based Speech-to-Text.
  - OCR: Tesseract.js.
  - Image: Browser Canvas API or specialized Wasm.
- **State & Queue Management**: Zustand.

## The Smart Pipeline Architecture
1. **Intelligent Dropzone**: User drops any file. 
2. **Resource Analyzer**: Pre-flight check analyzes file type and size. 
   - *Small files* (<50MB): Loaded directly to RAM.
   - *Large files* (>50MB): Cached via OPFS, streamed in chunks to workers to prevent Out-Of-Memory page crashes.
3. **Engine Routing**: Web Worker Factory spins up the precise Wasm engine needed.
4. **Output**: Converted blob is provided for download, local cache is instantly purged.