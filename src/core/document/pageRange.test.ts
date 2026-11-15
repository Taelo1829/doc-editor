import { PDFDocument } from "@cantoo/pdf-lib";
import { describe, expect, it } from "vitest";
import { BlankPageSource } from "../../pdf/BlankPageSource";
import { PdfExporter } from "../../pdf/export/PdfExporter";
import type { DocumentState } from "./DocumentState";
import { extractPageRange, pageRangeError } from "./pageRange";

const document: DocumentState = {
  fileName: "Report.PDF",
  pages: [3, 1, 2].map((id) => ({
    id: String(id),
    source: new BlankPageSource({ width: id * 100, height: 400 }),
    userRotation: 90,
  })),
  annotations: [1, 2, 3].map((id) => ({
    id: `text-${id}`, pageId: String(id), type: "text",
    position: { x: 10, y: 10 }, text: `Page ${id}`, fontSize: 12, color: "#000000",
  })),
};

describe("page ranges", () => {
  it.each([
    [0, 2], [1, 4], [3, 2], [1.5, 2], [NaN, 2], [1, Infinity],
  ])("rejects invalid range %s–%s", (start, end) => {
    expect(pageRangeError({ start, end }, 3)).not.toBeNull();
    expect(() => extractPageRange(document, { start, end })).toThrow();
  });

  it("extracts inclusive endpoints in current order with only matching annotations", () => {
    const result = extractPageRange(document, { start: 2, end: 3 });
    expect(result.fileName).toBe("Report-pages-2-3.pdf");
    expect(result.pages.map((page) => page.id)).toEqual(["1", "2"]);
    expect(result.annotations.map((annotation) => annotation.pageId)).toEqual(["1", "2"]);
    expect(document.pages).toHaveLength(3);
    expect(document.annotations).toHaveLength(3);
  });

  it("supports single pages and the whole document", () => {
    expect(extractPageRange(document, { start: 3, end: 3 }).pages).toEqual([document.pages[2]]);
    expect(extractPageRange(document, { start: 1, end: 3 }).pages).toEqual(document.pages);
  });

  it("exports just the selected pages with their sizes and rotation", async () => {
    const extracted = extractPageRange(document, { start: 2, end: 3 });
    const output = await PDFDocument.load(await new PdfExporter().export(extracted));
    expect(output.getPageCount()).toBe(2);
    expect(output.getPages().map((page) => page.getWidth())).toEqual([100, 200]);
    expect(output.getPages().map((page) => page.getRotation().angle)).toEqual([90, 90]);
  });
});
