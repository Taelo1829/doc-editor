import type { TextAnnotation } from "../core/annotations/types";
import {
  RemoveAnnotationCommand,
  UpdateAnnotationCommand,
} from "../core/commands/annotationCommands";
import {
  DeletePageCommand,
  InsertPagesCommand,
  RotatePageCommand,
} from "../core/commands/pageCommands";
import {
  displaySize,
  hasDocument,
  originalPassword,
  type DocumentState,
} from "../core/document/DocumentState";
import { OperationCancelledError } from "../core/errors";
import { extractPageRange } from "../core/document/pageRange";
import { createId } from "../core/ids";
import type { EditorStore } from "../core/store/EditorStore";
import { ZOOM_LIMITS, type TextDraftChanges, type ToolSettings } from "../core/store/uiState";
import { A4_SIZE, BlankPageSource } from "../pdf/BlankPageSource";
import { PdfExporter, editedFileName, type ExportOptions } from "../pdf/export/PdfExporter";
import { loadPdf, type LoadedPdf } from "../pdf/loadPdf";
import type { DialogController } from "./dialogs/DialogController";
import { planTextEditOutcome } from "./text/textEditing";
import { readImageFile } from "./files/readImageFile";
import { saveBytes } from "./files/saveBytes";

/**
 * The editor's user-facing operations that involve files, async work or several
 * store calls. Components call these instead of orchestrating the store themselves.
 */
export class EditorActions {
  private readonly exporter = new PdfExporter();

  constructor(
    private readonly store: EditorStore,
    private readonly dialogs: DialogController,
  ) {}

  async openPdf(file: File): Promise<void> {
    await this.reportFailures(async () => {
      const loaded = await this.load(file);
      this.store.openDocument({ fileName: loaded.name, pages: loaded.pages, annotations: [] });
    });
  }

  /** Adds every page of another PDF after the last page. */
  async appendPdf(file: File): Promise<void> {
    await this.reportFailures(async () => {
      const loaded = await this.load(file);
      const pageCount = this.store.getSnapshot().document.pages.length;
      this.store.execute(new InsertPagesCommand(loaded.pages, pageCount));
      this.store.showNotice(`Added ${loaded.pages.length} page(s) from ${loaded.name}.`);
    });
  }

  /** Inserts a blank page after the active page, sized to match it. */
  insertBlankPageAfterActive(): void {
    const { document, ui } = this.store.getSnapshot();
    const activeIndex = document.pages.findIndex((page) => page.id === ui.activePageId);
    const activePage = document.pages[activeIndex];
    const size = activePage ? displaySize(activePage) : A4_SIZE;
    const page = { id: createId("page"), source: new BlankPageSource(size), userRotation: 0 as const };
    this.store.execute(new InsertPagesCommand([page], activeIndex + 1));
    this.store.setActivePage(page.id);
  }

  rotatePageClockwise(pageId: string): void {
    this.store.execute(new RotatePageCommand(pageId, 1));
  }

  rotatePageAnticlockwise(pageId: string): void {
    this.store.execute(new RotatePageCommand(pageId, 3));
  }

  deletePage(pageId: string): void {
    if (this.store.getSnapshot().document.pages.length === 1) {
      this.store.showNotice("A document needs at least one page.");
      return;
    }
    this.store.execute(new DeletePageCommand(pageId));
  }

  deleteSelectedAnnotation(): void {
    const selectedId = this.store.getSnapshot().ui.selectedAnnotationId;
    if (selectedId) {
      this.store.execute(new RemoveAnnotationCommand(selectedId));
    }
  }

  async chooseImage(file: File): Promise<void> {
    await this.reportFailures(async () => {
      this.store.holdImageForPlacement(await readImageFile(file));
      this.store.showNotice("Click on a page to place the image.");
    });
  }

  async save(): Promise<void> {
    const { document } = this.store.getSnapshot();
    if (!hasDocument(document)) {
      return;
    }
    await this.reportFailures(async () => {
      const options = await this.chooseExportOptions(document);
      const bytes = await this.exporter.export(document, options);
      const saved = await saveBytes(bytes, editedFileName(document.fileName));
      if (saved) {
        this.store.markSaved();
        this.store.showNotice(options.password ? `Saved ${saved} with password protection.` : `Saved ${saved}.`);
      }
    });
  }

  async splitByRange(): Promise<void> {
    this.finishTextEdit();
    const { document } = this.store.getSnapshot();
    if (!hasDocument(document)) return;
    await this.reportFailures(async () => {
      const range = await this.dialogs.ask({ kind: "pageRange", pageCount: document.pages.length });
      if (!range) return;
      const extracted = extractPageRange(document, range);
      const options = await this.chooseExportOptions(extracted);
      const bytes = await this.exporter.export(extracted, options);
      const saved = await saveBytes(bytes, extracted.fileName);
      if (saved) this.store.showNotice(`Saved pages ${range.start}–${range.end} as ${saved}.`);
    });
  }

  zoomIn(): void {
    this.store.setZoom(this.store.getSnapshot().ui.zoom * ZOOM_LIMITS.step);
  }

  zoomOut(): void {
    this.store.setZoom(this.store.getSnapshot().ui.zoom / ZOOM_LIMITS.step);
  }

  /** Saves the text being typed (if any) and closes the text box. Safe to call twice. */
  finishTextEdit(): void {
    const { document, ui } = this.store.getSnapshot();
    if (!ui.textEdit) {
      return;
    }
    const outcome = planTextEditOutcome(ui.textEdit, document);
    this.store.endTextEdit();
    if (outcome.command) {
      this.store.execute(outcome.command);
    }
    if (outcome.selectId) {
      this.store.selectAnnotation(outcome.selectId);
    }
  }

  /** Closes the text box without saving what was typed. */
  discardTextEdit(): void {
    this.store.endTextEdit();
  }

  /**
   * Sets the text size everywhere it applies right now: the text being typed,
   * the selected text box, and the default for new text.
   */
  setFontSize(fontSize: number): void {
    this.applyTextStyle({ fontSize }, { fontSize });
  }

  setTextColor(color: string): void {
    this.applyTextStyle({ color }, { textColor: color });
  }

  /** Escape: leave whatever is in progress and go back to selecting. */
  cancelCurrentAction(): void {
    this.store.cancelPreview();
    this.store.endTextEdit();
    this.store.clearPendingImage();
    this.store.selectTool("select");
  }

  private applyTextStyle(style: TextDraftChanges, defaults: Partial<ToolSettings>): void {
    const { document, ui } = this.store.getSnapshot();
    this.store.updateSettings(defaults);
    if (ui.textEdit) {
      this.store.updateTextDraft(style);
      return;
    }
    const selected = document.annotations.find((annotation) => annotation.id === ui.selectedAnnotationId);
    if (selected?.type === "text") {
      this.store.execute(new UpdateAnnotationCommand<TextAnnotation>(selected.id, style));
    }
  }

  private load(file: File): Promise<LoadedPdf> {
    return loadPdf(file, (request) => this.dialogs.ask({ kind: "password", ...request }));
  }

  /**
   * Pages from a password-protected file are decrypted for editing, so ask whether the
   * saved copy should be protected again rather than silently dropping the password.
   */
  private async chooseExportOptions(document: DocumentState): Promise<ExportOptions> {
    const password = originalPassword(document);
    if (password === null) {
      return { password: null };
    }
    const choice = await this.dialogs.ask({ kind: "saveProtection", originalPassword: password });
    if (!choice) {
      throw new OperationCancelledError("Saving");
    }
    return { password: choice.password };
  }

  private async reportFailures(work: () => Promise<void>): Promise<void> {
    try {
      await work();
    } catch (error) {
      if (error instanceof OperationCancelledError) {
        return;
      }
      console.error(error);
      this.store.showNotice(error instanceof Error ? error.message : "Something went wrong.");
    }
  }
}
