# mp33pm Changelog

## [Unreleased]
### Added
- Created `CHANGELOG.md` to track project updates.
- Initialized Next.js project with Tailwind CSS, TypeScript, and ESLint.
- Installed required dependencies: `framer-motion`, `zustand`, `@ffmpeg/ffmpeg`, `lucide-react`, etc.
- Configured `next.config.ts` to include `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers, and `allowedDevOrigins` for local testing.
- Built the `SmartPipeline` architecture:
  - `FileAnalyzer`: Scans files instantly for type and size (detects `isHeavy` >100MB).
  - `StorageManager`: Utilizes the browser's Origin Private File System (OPFS) to cache heavy files to disk instead of RAM to prevent fatal crashes.
- Created `useQueueStore` using Zustand to track the file conversion queue and automatically route files using the `SmartPipeline`.
- Built the `UniversalDropzone` component with `framer-motion` for liquid-smooth symmetric UI.
- Converted `UniversalDropzone` into a **"3-Mode Action Hub"** Staging Area, injecting parameter configuration natively in the browser before queue dispatch.
  - Added [Swap Format], [Compress Size], and [AI Extract] dropdown pathways based on the file `category`.
  - Added new `Presentation` category handling for `.pptx`, `.key`.
  - Replaced generic compression options with professional-grade toggles (e.g. `High Quality CRF 23` for Video, `Reduce Image DPI (150)` for PDF/PPTX, `Standard Voice (64kbps)` for Audio).
- Updated `src/app/page.tsx` and `src/app/globals.css` with the initial dark-mode "mp33pm" aesthetic, incorporating Apple-level frosted glass, dynamic hover states, and premium typography.

### Fixed
- Fixed a React Hydration Error caused by browser extensions (like Grammarly) overriding `<html>` and `<body>` tags by applying the `suppressHydrationWarning` attribute.
- Fixed an issue where the Tailwind UI failed to load due to outdated v3 CSS directives, replacing it with the new v4 `@import "tailwindcss";` syntax.
