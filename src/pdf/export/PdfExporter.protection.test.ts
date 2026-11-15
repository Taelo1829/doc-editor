import { PDFDocument, StandardFonts } from "@cantoo/pdf-lib";
import { getDocument } from "pdfjs-dist/legacy/build/pdf.mjs";
import { describe, expect, it } from "vitest";
import type { DocumentState } from "../../core/document/DocumentState";
import { originalPassword } from "../../core/document/DocumentState";
import { PdfPageSource, type SourceDocument } from "../PdfPageSource";
import { PdfExporter } from "./PdfExporter";

async function createProtectedPdf(userPassword: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  pdf.addPage([400, 300]).drawText("Confidential terms", { x: 40, y: 200, size: 14, font });
  pdf.encrypt({ userPassword, ownerPassword: "owner-secret" });
  return pdf.save();
}

async function documentFrom(bytes: Uint8Array, password: string | null): Promise<DocumentState> {
  const source: SourceDocument = {
    id: "src",
    name: "locked.pdf",
    bytes,
    password,
    proxy: {} as SourceDocument["proxy"],
  };
  return {
    fileName: "locked.pdf",
    pages: [{ id: "p", source: new PdfPageSource(source, 0, { width: 400, height: 300 }, 0), userRotation: 0 }],
    annotations: [],
  };
}

async function extractText(bytes: Uint8Array, password?: string): Promise<string> {
  const pdf = await getDocument({ data: bytes.slice(), password }).promise;
  const content = await (await pdf.getPage(1)).getTextContent();
  return content.items.map((item) => ("str" in item ? item.str : "")).join("");
}

describe("PdfExporter with password-protected sources", () => {
  it("decrypts the pages so they can be saved without a password", async () => {
    const document = await documentFrom(await createProtectedPdf("open-sesame"), "open-sesame");
    const output = await new PdfExporter().export(document, { password: null });

    expect(await extractText(output)).toBe("Confidential terms");
    expect((await PDFDocument.load(output)).isEncrypted).toBe(false);
  });

  it("re-protects the saved file with the chosen password", async () => {
    const document = await documentFrom(await createProtectedPdf("open-sesame"), "open-sesame");
    const output = await new PdfExporter().export(document, { password: "new-pass" });

    await expect(extractText(output)).rejects.toMatchObject({ name: "PasswordException" });
    expect(await extractText(output, "new-pass")).toBe("Confidential terms");
  });

  it("opens files that are only permission-protected without asking for a password", async () => {
    const document = await documentFrom(await createProtectedPdf(""), null);
    const output = await new PdfExporter().export(document);
    expect(await extractText(output)).toBe("Confidential terms");
  });

  it("remembers the original password to offer on save", async () => {
    expect(originalPassword(await documentFrom(new Uint8Array(), "open-sesame"))).toBe("open-sesame");
    expect(originalPassword(await documentFrom(new Uint8Array(), null))).toBeNull();
  });
});
