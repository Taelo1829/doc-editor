import type { Point, Size } from "../../core/geometry";
import type { EditorStore } from "../../core/store/EditorStore";
import type { ToolId } from "../../core/store/uiState";

/** A pointer event translated into page coordinates. */
export interface PagePointer {
  readonly pageId: string;
  /** Position in page points, origin top-left of the page as shown. */
  readonly point: Point;
  readonly pageSize: Size;
  /** The annotation under the pointer when the gesture started, if any. */
  readonly hitAnnotationId: string | null;
  /** True when the gesture started on the selected annotation's resize handle. */
  readonly onResizeHandle: boolean;
}

/**
 * One editing mode. The page forwards pointer gestures to the active tool,
 * which turns them into store updates. Add a tool by implementing this
 * interface and registering it in `toolRegistry`.
 */
export interface Tool {
  readonly id: ToolId;
  readonly label: string;
  readonly shortcut: string;
  readonly hint: string;
  readonly cursor: string;
  pointerDown(pointer: PagePointer, store: EditorStore): void;
  pointerMove(pointer: PagePointer, store: EditorStore): void;
  pointerUp(pointer: PagePointer, store: EditorStore): void;
  doubleClick(pointer: PagePointer, store: EditorStore): void;
}

/** Tools extend this and override only the gestures they care about. */
export abstract class BaseTool implements Tool {
  abstract readonly id: ToolId;
  abstract readonly label: string;
  abstract readonly shortcut: string;
  abstract readonly hint: string;
  readonly cursor: string = "crosshair";

  pointerDown(_pointer: PagePointer, _store: EditorStore): void {}
  pointerMove(_pointer: PagePointer, _store: EditorStore): void {}
  pointerUp(_pointer: PagePointer, _store: EditorStore): void {}
  doubleClick(_pointer: PagePointer, _store: EditorStore): void {}
}
