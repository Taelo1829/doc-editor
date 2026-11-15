import type { PDFPage } from "@cantoo/pdf-lib";
import type { Rotation, Size } from "../core/geometry";
import type {
  ExportSession,
  PageSource,
  RenderRequest,
  SourceFile,
} from "../core/pages/PageSource";
import type { PDFDocumentProxy } from "./pdfjs";

/** An opened PDF file. Shared by all of its pages. */
export interface SourceDocument extends SourceFile {
  readonly name: string;
  /** The pdf.js handle used for drawing pages on screen. */
  readonly proxy: PDFDocumentProxy;
}

export class RenderCancelledError extends Error {
  constructor() {
    super("Render cancelled");
    this.name = "RenderCancelledError";
  }
}

export class PdfPageSource implements PageSource {
  readonly key: string;
  readonly originLabel: string;

  constructor(
    private readonly document: SourceDocument,
    private readonly pageIndex: number,
    readonly size: Size,
    readonly intrinsicRotation: Rotation,
  ) {
    this.key = `${document.id}#${pageIndex}`;
    this.originLabel = `${document.name} · p${pageIndex + 1}`;
  }

  get openedWithPassword(): string | null {
    return this.document.password;
  }

  async renderTo(canvas: HTMLCanvasElement, request: RenderRequest): Promise<void> {
    const page = await this.document.proxy.getPage(this.pageIndex + 1);
    const viewport = page.getViewport({
      scale: request.scale * request.pixelRatio,
      rotation: request.rotation,
    });
    canvas.width = Math.ceil(viewport.width);
    canvas.height = Math.ceil(viewport.height);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is unavailable");
    }

    const task = page.render({ canvasContext: context, viewport });
    const cancel = () => task.cancel();
    request.signal?.addEventListener("abort", cancel, { once: true });
    try {
      await task.promise;
    } catch (error) {
      throw request.signal?.aborted ? new RenderCancelledError() : error;
    } finally {
      request.signal?.removeEventListener("abort", cancel);
    }
  }

  async appendTo(session: ExportSession): Promise<PDFPage> {
    const source = await session.loadSource(this.document);
    const [copied] = await session.output.copyPages(source, [this.pageIndex]);
    if (!copied) {
      throw new Error(`Could not copy page ${this.pageIndex + 1} of ${this.document.name}`);
    }
    return session.output.addPage(copied);
  }
}
