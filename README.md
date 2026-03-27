# mp33pm

Browser-local file processing suite for conversion, compression, and extraction across media, documents, images, spreadsheets, and presentations.

## Local development

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open http://localhost:3000

## Verification commands

Run the full verification pipeline:

```bash
npm run verify:all
```

Equivalent command sequence:

```bash
npm run lint
npm run test
npm run build
```

## Test coverage currently included

1. Compression target parsing and ratio metrics.
2. Unified extraction schema validation.
3. File analyzer category/mode/target checks.
4. Analyzer matrix checks across representative file types.
5. Presentation engine smoke tests for:
	- PPTX to PDF conversion path
	- Presentation JSON extraction
	- Unsupported legacy PPT container rejection

## Deployment guide

### Option A: Vercel (recommended)

1. Push branch to GitHub.
2. Import repository in Vercel.
3. Framework preset: Next.js.
4. Build command: `npm run build`
5. Install command: `npm install`
6. Output: default Next.js output.
7. Before promoting to production, run:

```bash
npm run deploy:check
```

### Option B: Self-hosted Node

1. Build on CI or server:

```bash
npm ci
npm run verify:all
```

2. Start production server:

```bash
npm run start
```

## Runtime notes

1. PDF extraction uses local worker asset: `/pdf.worker.min.mjs`.
2. Cross-origin isolation headers are configured in [next.config.ts](next.config.ts) to support browser WASM workloads.
3. Long media transcription is chunked to reduce memory pressure in browser runtime.
