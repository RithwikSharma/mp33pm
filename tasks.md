# Roadmap & Current Tasks

## Phase 1: The UI & Foundation Overhaul
- [x] Next.js 15 Foundation & Security Headers.
- [ ] Overhaul UI: Make the Universal Dropzone extremely pleasant, Apple-like, and visually pleasing.
- [ ] Build the "Hardware Monitor" to display system constraints to the user dynamically.

## Phase 2: The Smart Pipeline Engine
- [ ] Build the `SmartRouter`: Analyzes file size/type and decides memory usage strategy.
- [ ] Implement OPFS (Origin Private File System) caching for massive files to prevent browser crashes.
- [ ] Set up the 'Worker Factory' for dynamic, non-blocking `.wasm` binary loading.

## Phase 3: All-In-One Conversion Modules
- [ ] **Media Module**: Video/Audio formats (mp4, mp3, wav, gif, etc.) via FFmpeg.
- [ ] **Document Module**: PDF to Word, Word to PDF.
- [ ] **Data Module**: Excel to CSV/JSON, CSV to Excel (SheetJS).
- [ ] **AI Module**: Audio to Transcript (Whisper / Transformers.js).
- [ ] **Image Module**: WebP, PNG, JPG fast conversions.