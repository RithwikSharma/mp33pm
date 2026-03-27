export type ExtractionSegment = {
  id: string;
  kind: "word" | "line" | "page" | "slide" | "row" | "chunk" | "unknown";
  text: string;
  startMs?: number;
  endMs?: number;
  confidence?: number;
  source?: Record<string, string | number | boolean | null>;
};

export type ExtractionPayload = {
  schemaVersion: "1.0";
  engine: "ai" | "document" | "spreadsheet" | "presentation" | "media" | "image";
  sourceExtension: string;
  generatedAt: string;
  rawText: string;
  segments: ExtractionSegment[];
  metadata?: Record<string, string | number | boolean | null>;
};

export function createExtractionPayload(input: Omit<ExtractionPayload, "schemaVersion" | "generatedAt">): ExtractionPayload {
  return {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    ...input,
  };
}

export function toMs(seconds?: number): number | undefined {
  if (typeof seconds !== "number" || Number.isNaN(seconds)) return undefined;
  return Math.max(0, Math.round(seconds * 1000));
}
