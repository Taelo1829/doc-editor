import type { PDFDocument, PDFPage } from "@cantoo/pdf-lib";
import type { Rotation, Size } from "../geometry";

export interface RenderRequest {
  /** CSS pixels per PDF point. */
  readonly scale: number;
  /** Final rotation to draw the page at (the page's own rotation plus any user turns). */
  readonly rotation: Rotation;
  /** Device pixel ratio, so the canvas stays sharp on high-density screens. */
  readonly pixelRatio: number;
  /** Aborting stops the render early, e.g. when the zoom changes mid-render. */
  readonly signal?: AbortSignal;
}

/** An original PDF file, as needed to copy pages out of it. */
export interface SourceFile {
  readonly id: string;
  readonly bytes: Uint8Array;
  /** The password the file was opened with, or null if it didn't need one. */
  readonly password: string | null;
}

/** Remembers which source documents have already been opened during one export. */
export interface ExportSession {
  readonly output: PDFDocument;
  loadSource(source: SourceFile): Promise<PDFDocument>;
}

/**
 * Where a page's content comes from: a page in an opened PDF, a blank sheet, and so on.
 * New kinds of page are added by implementing this interface.
 */
export interface PageSource {
  /** Stable identity, used to cache rendered output. */
  readonly key: string;
  /** Size of the page before any rotation, in PDF points. */
  readonly size: Size;
  /** Rotation the page already carries in its source file. */
  readonly intrinsicRotation: Rotation;
  /** Short label for the page's origin, shown in the sidebar. */
  readonly originLabel: string;
  /** The password the page's file was opened with, or null if it had none. */
  readonly openedWithPassword: string | null;

  renderTo(canvas: HTMLCanvasElement, request: RenderRequest): Promise<void>;
  appendTo(session: ExportSession): Promise<PDFPage>;
}
