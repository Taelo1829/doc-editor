import type { DocumentCommand } from "../commands/Command";
import { EMPTY_DOCUMENT, type DocumentState } from "../document/DocumentState";
import { clamp } from "../geometry";
import { History } from "../history/History";
import {
  INITIAL_UI_STATE,
  ZOOM_LIMITS,
  type PendingImage,
  type TextDraftChanges,
  type TextEditSession,
  type ToolId,
  type ToolSettings,
  type UiState,
} from "./uiState";

export interface EditorSnapshot {
  readonly document: DocumentState;
  readonly ui: UiState;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly undoLabel: string | null;
  readonly redoLabel: string | null;
  readonly hasUnsavedChanges: boolean;
}

type Listener = () => void;

/**
 * The single source of truth for the editor.
 *
 * Document edits go through commands so they can be undone. A command can also be
 * previewed — shown on screen without being recorded — which is how drags and
 * drawings update live and land in history as one step when the gesture ends.
 */
export class EditorStore {
  private readonly history = new History<DocumentState>(EMPTY_DOCUMENT);
  private readonly listeners = new Set<Listener>();
  private ui: UiState = INITIAL_UI_STATE;
  private previewCommand: DocumentCommand | null = null;
  private savedDocument: DocumentState = EMPTY_DOCUMENT;
  private snapshot: EditorSnapshot = this.buildSnapshot();

  // ── Subscribing ────────────────────────────────────────────────────────────

  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): EditorSnapshot => this.snapshot;

  // ── Document lifecycle ─────────────────────────────────────────────────────

  openDocument(document: DocumentState): void {
    this.previewCommand = null;
    this.history.reset(document);
    this.savedDocument = document;
    this.ui = {
      ...INITIAL_UI_STATE,
      settings: this.ui.settings,
      zoom: this.ui.zoom,
      activePageId: document.pages[0]?.id ?? null,
    };
    this.publish();
  }

  markSaved(): void {
    this.savedDocument = this.history.present;
    this.publish();
  }

  // ── Edits ──────────────────────────────────────────────────────────────────

  execute(command: DocumentCommand): void {
    this.previewCommand = null;
    this.history.commit(command.apply(this.history.present), command.label);
    this.publish();
  }

  /** Shows the result of a command without recording it. Replaces any earlier preview. */
  preview(command: DocumentCommand): void {
    this.previewCommand = command;
    this.publish();
  }

  commitPreview(): void {
    if (this.previewCommand) {
      this.execute(this.previewCommand);
    }
  }

  cancelPreview(): void {
    this.previewCommand = null;
    this.publish();
  }

  undo(): void {
    this.previewCommand = null;
    this.history.undo();
    this.publish();
  }

  redo(): void {
    this.previewCommand = null;
    this.history.redo();
    this.publish();
  }

  // ── Interface state ────────────────────────────────────────────────────────

  selectTool(tool: ToolId): void {
    this.updateUi({ activeTool: tool, selectedAnnotationId: null, textEdit: null });
  }

  updateSettings(changes: Partial<ToolSettings>): void {
    this.updateUi({ settings: { ...this.ui.settings, ...changes } });
  }

  selectAnnotation(annotationId: string): void {
    this.updateUi({ selectedAnnotationId: annotationId });
  }

  clearSelection(): void {
    this.updateUi({ selectedAnnotationId: null });
  }

  setActivePage(pageId: string): void {
    this.updateUi({ activePageId: pageId });
  }

  startTextEdit(session: TextEditSession): void {
    this.updateUi({ textEdit: session, selectedAnnotationId: null });
  }

  updateTextDraft(changes: TextDraftChanges): void {
    if (this.ui.textEdit) {
      this.updateUi({ textEdit: { ...this.ui.textEdit, ...changes } });
    }
  }

  endTextEdit(): void {
    this.updateUi({ textEdit: null });
  }

  holdImageForPlacement(image: PendingImage): void {
    this.updateUi({ pendingImage: image, activeTool: "image", selectedAnnotationId: null });
  }

  clearPendingImage(): void {
    this.updateUi({ pendingImage: null });
  }

  setZoom(zoom: number): void {
    this.updateUi({ zoom: clamp(zoom, ZOOM_LIMITS.min, ZOOM_LIMITS.max) });
  }

  showNotice(message: string): void {
    this.updateUi({ notice: message });
  }

  dismissNotice(): void {
    this.updateUi({ notice: null });
  }

  // ── Internals ──────────────────────────────────────────────────────────────

  private updateUi(changes: Partial<UiState>): void {
    this.ui = { ...this.ui, ...changes };
    this.publish();
  }

  private currentDocument(): DocumentState {
    const committed = this.history.present;
    return this.previewCommand ? this.previewCommand.apply(committed) : committed;
  }

  /** Drops references to annotations or pages that an edit or undo removed. */
  private reconcileUi(document: DocumentState): void {
    const annotationIds = new Set(document.annotations.map((annotation) => annotation.id));
    const pageIds = new Set(document.pages.map((page) => page.id));
    const selectionGone =
      this.ui.selectedAnnotationId !== null && !annotationIds.has(this.ui.selectedAnnotationId);
    const activePageGone = this.ui.activePageId !== null && !pageIds.has(this.ui.activePageId);

    if (selectionGone) {
      this.ui = { ...this.ui, selectedAnnotationId: null };
    }
    if (activePageGone || this.ui.activePageId === null) {
      this.ui = { ...this.ui, activePageId: document.pages[0]?.id ?? null };
    }
  }

  private buildSnapshot(): EditorSnapshot {
    const document = this.currentDocument();
    this.reconcileUi(document);
    return {
      document,
      ui: this.ui,
      canUndo: this.history.canUndo,
      canRedo: this.history.canRedo,
      undoLabel: this.history.undoLabel,
      redoLabel: this.history.redoLabel,
      hasUnsavedChanges: this.history.present !== this.savedDocument,
    };
  }

  private publish(): void {
    this.snapshot = this.buildSnapshot();
    this.listeners.forEach((listener) => listener());
  }
}
