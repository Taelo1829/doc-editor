import { memo, useLayoutEffect, useRef, useState } from "react";
import { getResizableRect } from "../../core/annotations/geometry";
import type { Annotation } from "../../core/annotations/types";
import type { Rect } from "../../core/geometry";
import { renderAnnotation } from "./annotationRenderers";

interface AnnotationGraphicsProps {
  readonly annotations: readonly Annotation[];
  /** Screen pixels per page point. */
  readonly scale: number;
  readonly selectedId?: string | null;
  /** An annotation to leave out, e.g. the text currently open in the editor. */
  readonly hiddenId?: string | null;
}

/** Pure drawing of a page's annotations. Used by both the editable pages and the thumbnails. */
export function AnnotationGraphics({
  annotations,
  scale,
  selectedId = null,
  hiddenId = null,
}: AnnotationGraphicsProps) {
  return (
    <>
      {annotations
        .filter((annotation) => annotation.id !== hiddenId)
        .map((annotation) => (
          <AnnotationNode
            key={annotation.id}
            annotation={annotation}
            isSelected={annotation.id === selectedId}
            scale={scale}
          />
        ))}
    </>
  );
}

const AnnotationNode = memo(function AnnotationNode({
  annotation,
  isSelected,
  scale,
}: {
  annotation: Annotation;
  isSelected: boolean;
  scale: number;
}) {
  const groupRef = useRef<SVGGElement>(null);
  const [bounds, setBounds] = useState<Rect | null>(null);

  useLayoutEffect(() => {
    if (isSelected && groupRef.current) {
      const box = groupRef.current.getBBox();
      setBounds({ x: box.x, y: box.y, width: box.width, height: box.height });
    }
  }, [annotation, isSelected]);

  return (
    <>
      <g ref={groupRef} data-annotation-id={annotation.id} className="annotation">
        {renderAnnotation(annotation)}
      </g>
      {isSelected && bounds && (
        <SelectionFrame annotation={annotation} bounds={bounds} scale={scale} />
      )}
    </>
  );
});

function SelectionFrame({
  annotation,
  bounds,
  scale,
}: {
  annotation: Annotation;
  bounds: Rect;
  scale: number;
}) {
  const padding = 3 / scale;
  const handleSize = 9 / scale;
  const resizable = getResizableRect(annotation);
  return (
    <g data-annotation-id={annotation.id} className="selection-frame">
      <rect
        x={bounds.x - padding}
        y={bounds.y - padding}
        width={bounds.width + padding * 2}
        height={bounds.height + padding * 2}
        fill="none"
        strokeWidth={1.25 / scale}
        strokeDasharray={`${4 / scale} ${3 / scale}`}
        pointerEvents="none"
      />
      {resizable && (
        <rect
          data-resize-handle="true"
          className="resize-handle"
          x={resizable.x + resizable.width - handleSize / 2}
          y={resizable.y + resizable.height - handleSize / 2}
          width={handleSize}
          height={handleSize}
          rx={1.5 / scale}
          strokeWidth={1.25 / scale}
        />
      )}
    </g>
  );
}
