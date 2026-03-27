import { describe, expect, it } from "vitest";
import {
  calculateSizeMetrics,
  formatSizeMB,
  generateDynamicCompressionTargets,
  parseCompressionPreset,
  presetToRatio,
} from "@/lib/pipeline/compressionTargets";

describe("compressionTargets", () => {
  it("parses supported presets", () => {
    expect(parseCompressionPreset("80% (2 MB)")).toBe(80);
    expect(parseCompressionPreset("50% (1 MB)")).toBe(50);
    expect(parseCompressionPreset("30% (600 KB)")).toBe(30);
    expect(parseCompressionPreset("20% (400 KB)")).toBe(20);
  });

  it("falls back to 80 for unsupported values", () => {
    expect(parseCompressionPreset("5% (tiny)")).toBe(80);
    expect(parseCompressionPreset("unknown")).toBe(80);
  });

  it("formats sizes and generates all targets", () => {
    expect(formatSizeMB(0.5)).toContain("KB");
    expect(formatSizeMB(2)).toContain("MB");
    expect(formatSizeMB(1300)).toContain("GB");

    const targets = generateDynamicCompressionTargets(10);
    expect(targets).toEqual([
      "80% (8 MB)",
      "50% (5 MB)",
      "30% (3 MB)",
      "20% (2 MB)",
    ]);
  });

  it("returns ratio and size metrics", () => {
    expect(presetToRatio(50)).toBe(0.5);

    const metrics = calculateSizeMetrics(1000, 400);
    expect(metrics.savedBytes).toBe(600);
    expect(metrics.reductionPercent).toBe(60);
    expect(metrics.outputRatioPercent).toBe(40);
  });
});
