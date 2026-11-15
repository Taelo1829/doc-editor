import type { InkAnnotation } from "../../core/annotations/types";
import { AddAnnotationCommand } from "../../core/commands/annotationCommands";
import type { Point } from "../../core/geometry";
import { createId } from "../../core/ids";
import type { EditorStore } from "../../core/store/EditorStore";
import { BaseTool, type PagePointer } from "./Tool";

/** Ignore pointer jitter smaller than this, in points, to keep strokes light. */
const MIN_POINT_SPACING = 0.75;

export class DrawTool extends BaseTool {
  readonly id = "draw";
  readonly label = "Draw";
  readonly shortcut = "D";
  readonly hint = "Drag to draw freehand — good for signatures and marks.";

  private stroke: InkAnnotation | null = null;

  override pointerDown(pointer: PagePointer, store: EditorStore): void {
    const { inkColor, strokeWidth } = store.getSnapshot().ui.settings;
    this.stroke = {
      id: createId("ink"),
      pageId: pointer.pageId,
      type: "ink",
      points: [pointer.point],
      color: inkColor,
      strokeWidth,
    };
    store.preview(new AddAnnotationCommand(this.stroke));
  }

  override pointerMove(pointer: PagePointer, store: EditorStore): void {
    if (!this.stroke || !this.isFarEnough(pointer.point)) {
      return;
    }
    this.stroke = { ...this.stroke, points: [...this.stroke.points, pointer.point] };
    store.preview(new AddAnnotationCommand(this.stroke));
  }

  override pointerUp(_pointer: PagePointer, store: EditorStore): void {
    if (this.stroke) {
      store.commitPreview();
    }
    this.stroke = null;
  }

  private isFarEnough(point: Point): boolean {
    const last = this.stroke?.points.at(-1);
    return !last || Math.hypot(point.x - last.x, point.y - last.y) >= MIN_POINT_SPACING;
  }
}
