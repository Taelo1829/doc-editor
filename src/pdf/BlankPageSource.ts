import type { PDFPage } from "@cantoo/pdf-lib";
import { rotateSize, type Rotation, type Size } from "../core/geometry";
import { createId } from "../core/ids";
import type { ExportSession, PageSource, RenderRequest } from "../core/pages/PageSource";

export const A4_SIZE: Size = { width: 595.28, height: 841.89 };

export class BlankPageSource implements PageSource {
  readonly key = createId("blank");
  readonly intrinsicRotation: Rotation = 0;
  readonly originLabel = "Blank page";
  readonly openedWithPassword = null;

  constructor(readonly size: Size = A4_SIZE) {}

  async renderTo(canvas: HTMLCanvasElement, request: RenderRequest): Promise<void> {
    const shown = rotateSize(this.size, request.rotation);
    const ratio = request.scale * request.pixelRatio;
    canvas.width = Math.ceil(shown.width * ratio);
    canvas.height = Math.ceil(shown.height * ratio);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Canvas 2D context is unavailable");
    }
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
  }

  async appendTo(session: ExportSession): Promise<PDFPage> {
    return session.output.addPage([this.size.width, this.size.height]);
  }
}
