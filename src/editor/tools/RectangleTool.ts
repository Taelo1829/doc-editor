import type { Annotation } from "../../core/annotations/types";
import { AddAnnotationCommand } from "../../core/commands/annotationCommands";
import { rectFromCorners, type Point, type Rect } from "../../core/geometry";
import { createId } from "../../core/ids";
import type { EditorStore } from "../../core/store/EditorStore";
import type { ToolSettings } from "../../core/store/uiState";
import { BaseTool, type PagePointer } from "./Tool";

const MIN_DRAG = 3;

/** Shared drag-a-box behaviour. Subclasses decide what kind of box gets created. */
abstract class RectangleTool extends BaseTool {
  private start: { pageId: string; point: Point; id: string } | null = null;
  private hasArea = false;

  protected abstract createAnnotation(
    base: { id: string; pageId: string; rect: Rect },
    settings: ToolSettings,
  ): Annotation;

  override pointerDown(pointer: PagePointer): void {
    this.start = { pageId: pointer.pageId, point: pointer.point, id: createId(this.id) };
    this.hasArea = false;
  }

  override pointerMove(pointer: PagePointer, store: EditorStore): void {
    if (!this.start) {
      return;
    }
    const rect = rectFromCorners(this.start.point, pointer.point);
    this.hasArea = rect.width >= MIN_DRAG && rect.height >= MIN_DRAG;
    const annotation = this.createAnnotation(
      { id: this.start.id, pageId: this.start.pageId, rect },
      store.getSnapshot().ui.settings,
    );
    store.preview(new AddAnnotationCommand(annotation));
  }

  override pointerUp(_pointer: PagePointer, store: EditorStore): void {
    if (this.hasArea) {
      store.commitPreview();
    } else {
      store.cancelPreview();
    }
    this.start = null;
  }
}

export class HighlightTool extends RectangleTool {
  readonly id = "highlight";
  readonly label = "Highlight";
  readonly shortcut = "H";
  readonly hint = "Drag over text to highlight it.";

  protected createAnnotation(base: { id: string; pageId: string; rect: Rect }, settings: ToolSettings) {
    return { ...base, type: "highlight" as const, color: settings.highlightColor };
  }
}

export class WhiteoutTool extends RectangleTool {
  readonly id = "whiteout";
  readonly label = "White-out";
  readonly shortcut = "W";
  readonly hint = "Drag to cover existing content, then type over it with the Text tool.";

  protected createAnnotation(base: { id: string; pageId: string; rect: Rect }, settings: ToolSettings) {
    return { ...base, type: "whiteout" as const, color: settings.whiteoutColor };
  }
}
