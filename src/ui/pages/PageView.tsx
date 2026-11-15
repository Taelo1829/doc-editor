import { memo, useRef, type PointerEvent, type MouseEvent } from "react";
import type { Annotation } from "../../core/annotations/types";
import { displaySize, effectiveRotation, type PageEntry } from "../../core/document/DocumentState";
import type { UiState } from "../../core/store/uiState";
import type { PagePointer, Tool } from "../../editor/tools/Tool";
import { getTool } from "../../editor/tools/toolRegistry";
import { AnnotationGraphics } from "../annotations/AnnotationGraphics";
import { useEditorServices } from "../EditorContext";
import { PageCanvas } from "./PageCanvas";

interface PageViewProps {
  readonly page: PageEntry;
  readonly pageNumber: number;
  readonly annotations: readonly Annotation[];
  readonly ui: UiState;
  /** Rendered over the page while text on it is being edited. */
  readonly textEditor: React.ReactNode;
}

interface GestureStart {
  readonly hitAnnotationId: string | null;
  readonly onResizeHandle: boolean;
}

export const PageView = memo(function PageView({
  page,
  pageNumber,
  annotations,
  ui,
  textEditor,
}: PageViewProps) {
  const { store, actions } = useEditorServices();
  const svgRef = useRef<SVGSVGElement>(null);
  const gesture = useRef<GestureStart | null>(null);
  const lastPress = useRef<GestureStart | null>(null);
  const size = displaySize(page);
  const tool = getTool(ui.activeTool);
  const editingId = ui.textEdit?.annotationId ?? null;

  const pointerFrom = (event: PointerEvent | MouseEvent, start: GestureStart): PagePointer => ({
    pageId: page.id,
    point: toPagePoint(event, svgRef.current, ui.zoom),
    pageSize: size,
    ...start,
  });

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    if (event.button !== 0) {
      return;
    }
    // Stop the browser moving focus to the page, which would instantly close a text box we open.
    event.preventDefault();
    store.setActivePage(page.id);
    // A click outside an open text box only closes it; it doesn't start something new.
    if (store.getSnapshot().ui.textEdit) {
      actions.finishTextEdit();
      return;
    }
    event.currentTarget.setPointerCapture(event.pointerId);
    gesture.current = readGestureStart(event.target);
    lastPress.current = gesture.current;
    tool.pointerDown(pointerFrom(event, gesture.current), store);
  };

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (gesture.current) {
      tool.pointerMove(pointerFrom(event, gesture.current), store);
    }
  };

  const handlePointerUp = (event: PointerEvent<SVGSVGElement>) => {
    if (!gesture.current) {
      return;
    }
    tool.pointerUp(pointerFrom(event, gesture.current), store);
    gesture.current = null;
  };

  // Pointer capture retargets the double-click to the page itself,
  // so use what was under the pointer when it was last pressed.
  const handleDoubleClick = (event: MouseEvent<SVGSVGElement>) => {
    if (lastPress.current) {
      tool.doubleClick(pointerFrom(event, lastPress.current), store);
    }
  };

  return (
    <section
      id={pageElementId(page.id)}
      className="page"
      data-active={ui.activePageId === page.id || undefined}
      aria-label={`Page ${pageNumber}`}
    >
      <div className="page-sheet" style={{ width: size.width * ui.zoom, height: size.height * ui.zoom }}>
        <PageCanvas source={page.source} rotation={effectiveRotation(page)} scale={ui.zoom} />
        <svg
          ref={svgRef}
          className="page-overlay"
          viewBox={`0 0 ${size.width} ${size.height}`}
          style={{ cursor: cursorFor(tool, ui) }}
          onPointerDown={handlePointerDown}
          onMouseDown={(event) => event.preventDefault()}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onDoubleClick={handleDoubleClick}
        >
          <AnnotationGraphics
            annotations={annotations}
            scale={ui.zoom}
            selectedId={ui.selectedAnnotationId}
            hiddenId={editingId}
          />
        </svg>
        {textEditor}
      </div>
      <span className="page-number">{pageNumber}</span>
    </section>
  );
});

export function pageElementId(pageId: string): string {
  return `page-${pageId}`;
}

function toPagePoint(event: PointerEvent | MouseEvent, svg: SVGSVGElement | null, zoom: number) {
  const bounds = svg?.getBoundingClientRect();
  return {
    x: (event.clientX - (bounds?.left ?? 0)) / zoom,
    y: (event.clientY - (bounds?.top ?? 0)) / zoom,
  };
}

function readGestureStart(target: EventTarget): GestureStart {
  const element = target instanceof Element ? target : null;
  return {
    hitAnnotationId: element?.closest("[data-annotation-id]")?.getAttribute("data-annotation-id") ?? null,
    onResizeHandle: element?.closest("[data-resize-handle]") !== null && element !== null,
  };
}

function cursorFor(tool: Tool, ui: UiState): string {
  return tool.id === "image" && !ui.pendingImage ? "not-allowed" : tool.cursor;
}
