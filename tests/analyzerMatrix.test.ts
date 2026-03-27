import { describe, expect, it } from "vitest";
import { analyzeFile } from "@/lib/pipeline/FileAnalyzer";

const fixtures = [
  { name: "song.mp3", type: "audio/mpeg", category: "audio" },
  { name: "video.mp4", type: "video/mp4", category: "video" },
  { name: "doc.pdf", type: "application/pdf", category: "document" },
  { name: "sheet.xlsx", type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", category: "spreadsheet" },
  { name: "deck.pptx", type: "application/vnd.openxmlformats-officedocument.presentationml.presentation", category: "presentation" },
  { name: "image.png", type: "image/png", category: "image" },
  { name: "blob.xyz", type: "application/octet-stream", category: "unknown" },
] as const;

describe("FileAnalyzer matrix", () => {
  it("returns valid category and targets for each representative extension", () => {
    for (const fixture of fixtures) {
      const file = new File([new Uint8Array(1024)], fixture.name, { type: fixture.type });
      const analyzed = analyzeFile(file);

      expect(analyzed.category).toBe(fixture.category);
      expect(analyzed.availableModes.length).toBeGreaterThan(0);
      expect(analyzed.modeTargets.convert?.length ?? 0).toBeGreaterThan(0);

      for (const mode of analyzed.availableModes) {
        const targets = analyzed.modeTargets[mode];
        expect(targets, `${fixture.name} missing targets for mode ${mode}`).toBeDefined();
        expect(targets?.length ?? 0).toBeGreaterThan(0);
      }
    }
  });

  it("keeps compression presets consistent across categories that support compression", () => {
    const compressableFiles = [
      new File([new Uint8Array(1024)], "song.mp3", { type: "audio/mpeg" }),
      new File([new Uint8Array(1024)], "video.mp4", { type: "video/mp4" }),
      new File([new Uint8Array(1024)], "doc.pdf", { type: "application/pdf" }),
      new File([new Uint8Array(1024)], "sheet.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
      new File([new Uint8Array(1024)], "deck.pptx", { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }),
      new File([new Uint8Array(1024)], "image.png", { type: "image/png" }),
    ];

    for (const file of compressableFiles) {
      const analyzed = analyzeFile(file);
      const targets = analyzed.modeTargets.compress ?? [];
      expect(targets.length).toBe(4);
      expect(targets[0]).toContain("80%");
      expect(targets[1]).toContain("50%");
      expect(targets[2]).toContain("30%");
      expect(targets[3]).toContain("20%");
    }
  });
});
