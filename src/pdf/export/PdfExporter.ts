import { PDFDocument, StandardFonts, degrees, type PDFFont, type PDFPage } from "@cantoo/pdf-lib";
import {
  annotationsOnPage,
  effectiveRotation,
  type DocumentState,
  type PageEntry,
} from "../../core/document/DocumentState";
import { PageCoordinateMapper } from "../../core/coordinates/PageCoordinateMapper";
import { normalizeRotation } from "../../core/geometry";
import type { ExportSession, SourceFile } from "../../core/pages/PageSource";
import { writeAnnotation } from "./annotationWriters";

export interface ExportOptions {
  /** Password needed to open the saved file, or null to save it unprotected. */
  readonly password: string | null;
}

const UNPROTECTED: ExportOptions = { password: null };

class CachingExportSession implements ExportSession {
  private readonly sources = new Map<string, Promise<PDFDocument>>();

  constructor(readonly output: PDFDocument) {}

  loadSource(source: SourceFile): Promise<PDFDocument> {
    const cached = this.sources.get(source.id);
    if (cached) {
      return cached;
    }
    // An empty password also opens files that are encrypted only to restrict
    // permissions (no password needed to view), so pass one either way.
    const loading = PDFDocument.load(source.bytes, { password: source.password ?? "" });
    this.sources.set(source.id, loading);
    return loading;
  }
}

/** Builds a brand-new PDF from the edited document, with every annotation flattened in. */
export class PdfExporter {
  async export(document: DocumentState, options: ExportOptions = UNPROTECTED): Promise<Uint8Array> {
    const output = await PDFDocument.create();
    const session = new CachingExportSession(output);
    const font = await output.embedFont(StandardFonts.Helvetica);

    for (const entry of document.pages) {
      const page = await this.appendPage(entry, session);
      await this.writeAnnotations(document, entry, page, { output, font });
    }

    output.setProducer("Doc Editor");
    output.setModificationDate(new Date());
    this.applyProtection(output, options);
    return output.save();
  }

  private applyProtection(output: PDFDocument, options: ExportOptions): void {
    if (options.password === null) {
      return;
    }
    output.encrypt({
      userPassword: options.password,
      ownerPassword: options.password,
      algorithm: "AES-256",
    });
  }

  private async appendPage(entry: PageEntry, session: ExportSession): Promise<PDFPage> {
    const page = await entry.source.appendTo(session);
    page.setRotation(degrees(effectiveRotation(entry)));
    return page;
  }

  private async writeAnnotations(
    document: DocumentState,
    entry: PageEntry,
    page: PDFPage,
    shared: { output: PDFDocument; font: PDFFont },
  ): Promise<void> {
    const mapper = new PageCoordinateMapper(
      page.getCropBox(),
      normalizeRotation(page.getRotation().angle),
    );
    for (const annotation of annotationsOnPage(document, entry.id)) {
      await writeAnnotation(annotation, { ...shared, page, mapper });
    }
  }
}

export function editedFileName(originalName: string): string {
  const base = originalName.replace(/\.pdf$/i, "") || "document";
  return `${base}-edited.pdf`;
}
