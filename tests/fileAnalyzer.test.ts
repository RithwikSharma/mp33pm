import { describe, expect, it } from "vitest";
import { analyzeFile } from "@/lib/pipeline/FileAnalyzer";

describe("FileAnalyzer", () => {
  it("exposes convert/compress/ai_extract for media", () => {
    const file = new File([new Uint8Array(1024)], "clip.mp4", { type: "video/mp4" });
    const analyzed = analyzeFile(file);

    expect(analyzed.category).toBe("video");
    expect(analyzed.availableModes).toContain("convert");
    expect(analyzed.availableModes).toContain("compress");
    expect(analyzed.availableModes).toContain("ai_extract");
    expect(analyzed.modeTargets.compress?.length).toBe(4);
  });

  it("enables spreadsheet compression and extraction targets", () => {
    const file = new File([new Uint8Array(1024)], "sheet.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const analyzed = analyzeFile(file);

    expect(analyzed.category).toBe("spreadsheet");
    expect(analyzed.availableModes).toContain("compress");
    expect(analyzed.availableModes).toContain("ai_extract");
    expect(analyzed.modeTargets.ai_extract?.[1]).toContain("JSON");
  });

  it("includes presentation ai_extract json target", () => {
    const file = new File([new Uint8Array(1024)], "deck.pptx", {
      type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    const analyzed = analyzeFile(file);

    expect(analyzed.category).toBe("presentation");
    expect(analyzed.modeTargets.ai_extract?.some((t) => t.toLowerCase().includes("json"))).toBe(true);
  });
});
