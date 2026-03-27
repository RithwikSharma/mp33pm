import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { processPresentation } from "@/lib/engine/PresentationEngine";

async function createMinimalPptx(): Promise<File> {
  const zip = new JSZip();

  zip.file(
    "ppt/presentation.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldSz cx="12192000" cy="6858000" type="screen16x9" />
</p:presentation>`
  );

  zip.file(
    "ppt/slides/slide1.xml",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:spTree>
      <p:sp>
        <p:txBody>
          <a:p>
            <a:r><a:t>Hello Slide</a:t></a:r>
          </a:p>
        </p:txBody>
      </p:sp>
    </p:spTree>
  </p:cSld>
</p:sld>`
  );

  zip.file(
    "ppt/slides/_rels/slide1.xml.rels",
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`
  );

  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "sample.pptx", {
    type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  });
}

describe("PresentationEngine", () => {
  it("converts pptx to pdf", async () => {
    const file = await createMinimalPptx();
    const result = await processPresentation("test-1", file, "pptx", "convert", "PDF Document (.pdf)", () => {});

    expect(result.extension).toBe("pdf");
    const blob = await fetch(result.url).then((res) => res.blob());
    expect(blob.size).toBeGreaterThan(100);
  });

  it("extracts structured json from pptx", async () => {
    const file = await createMinimalPptx();
    const result = await processPresentation("test-2", file, "pptx", "ai_extract", "Slides Structured JSON (.json)", () => {});

    expect(result.extension).toBe("json");
    const payload = JSON.parse(await fetch(result.url).then((res) => res.text())) as {
      schemaVersion?: string;
      engine?: string;
      segments?: Array<{ kind?: string; text?: string }>;
    };

    expect(payload.schemaVersion).toBe("1.0");
    expect(payload.engine).toBe("presentation");
    expect(payload.segments?.[0]?.kind).toBe("slide");
  });

  it("throws for unsupported binary .ppt containers", async () => {
    const file = new File([new Uint8Array([1, 2, 3, 4])], "legacy.ppt", {
      type: "application/vnd.ms-powerpoint",
    });

    await expect(
      processPresentation("test-3", file, "ppt", "convert", "PDF Document (.pdf)", () => {})
    ).rejects.toThrow(/Unsupported presentation container/i);
  });
});
