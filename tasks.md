# Roadmap & Current Tasks

## Phase 1: The Core Engine [IN PROGRESS]
- [ ] Initialize Next.js with `headers.js` to enable Cross-Origin Isolation (required for FFmpeg threads).
- [ ] Set up a 'Worker Factory' to handle `.wasm` binary loading.
- [ ] Implement Audio-to-Audio (mp3, wav, ogg) as the MVP.

## Phase 2: The "Unlimited" UI
- [ ] Create a "Hardware Monitor" component showing the user's available RAM/CPU usage during conversion.
- [ ] Build a "Symmetrical Palette" UI reflecting the name 'mp33pm'.

## Phase 3: Advanced Modules
- [ ] PDF to Word (Client-side OCR via Tesseract.js if needed).
- [ ] Audio to Transcript (Whisper.wasm integration).
- [ ] Batch Processing (Parallel worker pool).