import { describe, expect, it } from "vitest";
import { createExtractionPayload, toMs } from "@/lib/engine/extraction";

describe("extraction schema", () => {
  it("builds a normalized payload", () => {
    const payload = createExtractionPayload({
      engine: "document",
      sourceExtension: "pdf",
      rawText: "hello world",
      segments: [
        {
          id: "page-1",
          kind: "page",
          text: "hello world",
          source: { page: 1 },
        },
      ],
      metadata: { segmentCount: 1 },
    });

    expect(payload.schemaVersion).toBe("1.0");
    expect(payload.generatedAt).toBeTruthy();
    expect(payload.segments[0].kind).toBe("page");
  });

  it("converts seconds to ms safely", () => {
    expect(toMs(1.234)).toBe(1234);
    expect(toMs(undefined)).toBeUndefined();
  });
});
