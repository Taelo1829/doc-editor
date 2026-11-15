import { PDFDocument, degrees } from "@cantoo/pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import type { Annotation } from "../../core/annotations/types";
import type { DocumentState, PageEntry } from "../../core/document/DocumentState";
import type { Rotation } from "../../core/geometry";
import { BlankPageSource } from "../BlankPageSource";
import { PdfPageSource, type SourceDocument } from "../PdfPageSource";
import { PdfExporter, editedFileName } from "./PdfExporter";

// 1×1 red PNG
const PNG_DATA_URL =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==";

async function createSourceBytes(): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.addPage([600, 800]);
  pdf.addPage([600, 800]).setRotation(degrees(90));
  return pdf.save();
}

function pdfPage(document: SourceDocument, index: number, intrinsicRotation: Rotation, userRotation: Rotation): PageEntry {
  return {
    id: `p${index}`,
    source: new PdfPageSource(document, index, { width: 600, height: 800 }, intrinsicRotation),
    userRotation,
  };
}

async function textPositions(bytes: Uint8Array, pageNumber: number) {
  const pdf = await getDocument({ data: bytes.slice() }).promise;
  const page = await pdf.getPage(pageNumber);
  const content = await page.getTextContent();
  return content.items.flatMap((item) =>
    "str" in item ? [{ text: item.str, x: item.transform[4] as number, y: item.transform[5] as number }] : [],
  );
}

describe("PdfExporter", () => {
  it("writes pages in order with their rotation and every annotation type", async () => {
    const source: SourceDocument = {
      id: "src",
      name: "source.pdf",
      bytes: await createSourceBytes(),
      password: null,
      proxy: {} as SourceDocument["proxy"],
    };
    const annotations: Annotation[] = [
      { id: "t", pageId: "p0", type: "text", position: { x: 50, y: 100 }, text: "Hello\nWorld", fontSize: 10, color: "#000000" },
      { id: "i", pageId: "p0", type: "ink", points: [{ x: 1, y: 1 }, { x: 20, y: 20 }], strokeWidth: 2, color: "#1f4fd1" },
      { id: "h", pageId: "p0", type: "highlight", rect: { x: 10, y: 10, width: 100, height: 20 }, color: "#ffd43b" },
      { id: "w", pageId: "p1", type: "whiteout", rect: { x: 10, y: 10, width: 100, height: 20 }, color: "#ffffff" },
      { id: "m", pageId: "blank", type: "image", rect: { x: 10, y: 10, width: 40, height: 40 }, dataUrl: PNG_DATA_URL, mimeType: "image/png" },
      { id: "u", pageId: "blank", type: "text", position: { x: 10, y: 10 }, text: "naïve — ✓", fontSize: 12, color: "#000000" },
    ];
    const document: DocumentState = {
      fileName: "source.pdf",
      pages: [
        pdfPage(source, 1, 90, 0),
        { id: "blank", source: new BlankPageSource({ width: 300, height: 400 }), userRotation: 0 },
        pdfPage(source, 0, 0, 90),
      ],
      annotations,
    };
    // Page ids above are p1, blank, p0 — so page order is reversed relative to the source.

    const bytes = await new PdfExporter().export(document);
    const output = await PDFDocument.load(bytes);

    expect(output.getPageCount()).toBe(3);
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([90, 0, 90]);
    expect(output.getPage(1).getSize()).toEqual({ width: 300, height: 400 });

    // Characters outside the built-in font (the tick) are replaced rather than failing the export.
    const blankText = await textPositions(bytes, 2);
    expect(blankText.map((item) => item.text).join("")).toBe("naïve — ?");

    // Third page shows source page 0 turned 90°: screen (50, 100 + baseline 10) maps to PDF x=110, y=50.
    const rotatedText = await textPositions(bytes, 3);
    const hello = rotatedText.find((item) => item.text === "Hello");
    expect(hello?.x).toBeCloseTo(110);
    expect(hello?.y).toBeCloseTo(50);
    const world = rotatedText.find((item) => item.text === "World");
    expect(world?.x).toBeCloseTo(122);
  });

  it("names the output after the original file", () => {
    expect(editedFileName("Lease Agreement.PDF")).toBe("Lease Agreement-edited.pdf");
    expect(editedFileName("")).toBe("document-edited.pdf");
  });
});
