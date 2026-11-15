import { getResizableRect } from "../../core/annotations/geometry";
import type { Annotation, AnnotationType } from "../../core/annotations/types";
import {
  MoveAnnotationCommand,
  ResizeAnnotationCommand,
} from "../../core/commands/annotationCommands";
import { findAnnotation } from "../../core/document/DocumentState";
import type { Point, Rect } from "../../core/geometry";
import type { EditorStore } from "../../core/store/EditorStore";
import { existingTextSession } from "../text/textEditing";
import { BaseTool, type PagePointer } from "./Tool";

const MIN_SIZE = 8;
const ASPECT_LOCKED: ReadonlySet<AnnotationType> = new Set(["image"]);

interface Gesture {
  update(pointer: PagePointer, store: EditorStore): void;
}

class MoveGesture implements Gesture {
  constructor(
    private readonly annotationId: string,
    private readonly start: Point,
  ) {}

  update(pointer: PagePointer, store: EditorStore): void {
    const dx = pointer.point.x - this.start.x;
    const dy = pointer.point.y - this.start.y;
    store.preview(new MoveAnnotationCommand(this.annotationId, dx, dy));
  }
}

class ResizeGesture implements Gesture {
  constructor(
    private readonly annotation: Annotation,
    private readonly startRect: Rect,
    private readonly start: Point,
  ) {}

  update(pointer: PagePointer, store: EditorStore): void {
    const width = Math.max(MIN_SIZE, this.startRect.width + pointer.point.x - this.start.x);
    const freeHeight = Math.max(MIN_SIZE, this.startRect.height + pointer.point.y - this.start.y);
    const height = ASPECT_LOCKED.has(this.annotation.type)
      ? width * (this.startRect.height / this.startRect.width)
      : freeHeight;
    store.preview(new ResizeAnnotationCommand(this.annotation.id, { ...this.startRect, width, height }));
  }
}

export class SelectTool extends BaseTool {
  readonly id = "select";
  readonly label = "Select";
  readonly shortcut = "V";
  readonly hint = "Click to select, drag to move. Double-click text to edit it.";
  override readonly cursor = "default";

  private gesture: Gesture | null = null;

  override pointerDown(pointer: PagePointer, store: EditorStore): void {
    if (!pointer.hitAnnotationId) {
      store.clearSelection();
      return;
    }
    store.selectAnnotation(pointer.hitAnnotationId);
    this.gesture = this.createGesture(pointer, store);
  }

  override pointerMove(pointer: PagePointer, store: EditorStore): void {
    this.gesture?.update(pointer, store);
  }

  override pointerUp(_pointer: PagePointer, store: EditorStore): void {
    if (this.gesture) {
      store.commitPreview();
    }
    this.gesture = null;
  }

  override doubleClick(pointer: PagePointer, store: EditorStore): void {
    const annotation = this.hitAnnotation(pointer, store);
    if (annotation?.type === "text") {
      store.startTextEdit(existingTextSession(annotation));
    }
  }

  private createGesture(pointer: PagePointer, store: EditorStore): Gesture {
    const annotation = this.hitAnnotation(pointer, store) as Annotation;
    const resizableRect = getResizableRect(annotation);
    if (pointer.onResizeHandle && resizableRect) {
      return new ResizeGesture(annotation, resizableRect, pointer.point);
    }
    return new MoveGesture(annotation.id, pointer.point);
  }

  private hitAnnotation(pointer: PagePointer, store: EditorStore): Annotation | null {
    if (!pointer.hitAnnotationId) {
      return null;
    }
    return findAnnotation(store.getSnapshot().document, pointer.hitAnnotationId);
  }
}
