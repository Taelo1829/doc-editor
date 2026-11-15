import type { TextAnnotation } from "../../core/annotations/types";
import type { EditorStore } from "../../core/store/EditorStore";
import { existingTextSession, newTextSession } from "../text/textEditing";
import { BaseTool, type PagePointer } from "./Tool";

export class TextTool extends BaseTool {
  readonly id = "text";
  readonly label = "Text";
  readonly shortcut = "T";
  readonly hint = "Click anywhere to type. Click existing text to edit it.";
  override readonly cursor = "text";

  override pointerDown(pointer: PagePointer, store: EditorStore): void {
    const existing = this.textUnderPointer(pointer, store);
    if (existing) {
      store.startTextEdit(existingTextSession(existing));
      return;
    }
    const { settings } = store.getSnapshot().ui;
    store.startTextEdit(newTextSession(pointer.pageId, pointer.point, settings));
  }

  private textUnderPointer(pointer: PagePointer, store: EditorStore): TextAnnotation | null {
    const hit = store
      .getSnapshot()
      .document.annotations.find((annotation) => annotation.id === pointer.hitAnnotationId);
    return hit?.type === "text" ? hit : null;
  }
}
