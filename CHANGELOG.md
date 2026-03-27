# mp33pm Changelog

## [Unreleased]
### Added
- Created `CHANGELOG.md` to track project updates.
- Initialized Next.js project with Tailwind CSS, TypeScript, and ESLint.
- Installed required dependencies: `framer-motion`, `zustand`, `@ffmpeg/ffmpeg`, `lucide-react`, etc.
- Configured `next.config.ts` to include `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers.
- Created `useQueueStore` using Zustand to track the file conversion queue.
- Built the `UniversalDropzone` component with `framer-motion` for liquid-smooth symmetric UI.
- Updated `src/app/page.tsx` and `src/app/globals.css` with the initial dark-mode "mp33pm" aesthetic.

### Fixed
- Fixed a React Hydration Error caused by browser extensions (like Grammarly) overriding `<html>` and `<body>` tags by applying the `suppressHydrationWarning` attribute.
- Fixed an issue where the Tailwind UI failed to load due to outdated v3 CSS directives, replacing it with the new v4 `@import "tailwindcss";` syntax.
