# Project: mp33pm (Master Specification)

## Core Philosophy
mp33pm is a "Zero-Server" file utility platform. All processing is 100% Client-Side (Edge).
- **Unlimited:** No file size limits or conversion caps (limited only by user RAM/CPU).
- **Privacy First:** Files never leave the browser.
- **Freemium:** No paywalls; supported by the "Open Power" of WebAssembly.

## Technical Stack
- **Frontend:** Next.js 15+ (App Router), Tailwind CSS, Framer Motion (for liquid-smooth UI).
- **Processing Engine:** - Audio/Video: FFmpeg.wasm (Multithreaded via SharedArrayBuffer).
  - Documents: Pandoc (Wasm) or pdf-lib + Mammoth.js.
  - Compression: Browser-native Compression Streams API.
- **State Management:** Zustand (lightweight, won't bloat).

## Endpoints & Routes
- `/` - The "Universal Dropzone": Context-aware converter.
- `/engine/` - Hidden route for the Web Worker heartbeat.
- `No Backend API:` This project has 0 traditional endpoints. All "logic" is in `/workers/*.js`.

## Data Flow
1. User drops file -> 2. Browser identifies MIME type -> 3. Appropriate Wasm module is lazy-loaded -> 4. Web Worker processes file -> 5. Local Blob URL generated for download.