export type CompressionPreset = 80 | 50 | 30 | 20;

export const COMPRESSION_PRESETS: CompressionPreset[] = [80, 50, 30, 20];

export function parseCompressionPreset(target: string): CompressionPreset {
  const match = target.match(/(80|50|30|20)%/i);
  const value = Number(match?.[1] || 80) as CompressionPreset;
  return COMPRESSION_PRESETS.includes(value) ? value : 80;
}

export function presetToRatio(preset: CompressionPreset): number {
  return preset / 100;
}

export function formatSizeMB(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  if (mb < 1) return `${Math.max(1, Math.round(mb * 1024))} KB`;
  return `${Math.round(mb)} MB`;
}

export function generateDynamicCompressionTargets(sizeMB: number): string[] {
  return COMPRESSION_PRESETS.map((preset) => {
    return `${preset}% (${formatSizeMB(sizeMB * presetToRatio(preset))})`;
  });
}

export function calculateSizeMetrics(inputBytes: number, outputBytes: number) {
  const savedBytes = Math.max(0, inputBytes - outputBytes);
  const reductionPercent = inputBytes > 0 ? (savedBytes / inputBytes) * 100 : 0;
  const outputRatioPercent = inputBytes > 0 ? (outputBytes / inputBytes) * 100 : 0;

  return {
    inputBytes,
    outputBytes,
    savedBytes,
    reductionPercent,
    outputRatioPercent,
  };
}
