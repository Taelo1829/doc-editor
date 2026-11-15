import type { ReactElement } from "react";
import {
  HIGHLIGHT_OPACITY,
  TEXT_LAYOUT,
  splitTextLines,
  type Annotation,
  type AnnotationOfType,
  type AnnotationType,
} from "../../core/annotations/types";
import { ANNOTATION_FONT_FAMILY, measureTextWidth } from "../text/measureText";

type Renderer<A extends Annotation> = (annotation: A) => ReactElement;
type RendererRegistry = { [T in AnnotationType]: Renderer<AnnotationOfType<T>> };

/** Thin strokes are hard to click, so ink gets an invisible wider hit area. */
const MIN_INK_HIT_WIDTH = 10;

/**
 * Draws each annotation type on screen, in page points (the SVG viewBox handles zoom).
 * Must stay visually in step with the PDF writers in `pdf/export/annotationWriters.ts`.
 */
const renderers: RendererRegistry = {
  text: (annotation) => {
    const lines = splitTextLines(annotation.text);
    const lineHeight = annotation.fontSize * TEXT_LAYOUT.lineHeight;
    const width = Math.max(...lines.map((line) => measureTextWidth(line, annotation.fontSize)), 4);
    return (
      <>
        <rect
          x={annotation.position.x}
          y={annotation.position.y}
          width={width}
          height={lines.length * lineHeight}
          fill="transparent"
        />
        <text
          fontFamily={ANNOTATION_FONT_FAMILY}
          fontSize={annotation.fontSize}
          fill={annotation.color}
          style={{ whiteSpace: "pre" }}
        >
          {lines.map((line, index) => (
            <tspan
              key={index}
              x={annotation.position.x}
              y={annotation.position.y + index * lineHeight + annotation.fontSize * TEXT_LAYOUT.baselineOffset}
            >
              {line || " "}
            </tspan>
          ))}
        </text>
      </>
    );
  },

  ink: (annotation) => {
    const [first] = annotation.points;
    if (annotation.points.length === 1 && first) {
      return <circle cx={first.x} cy={first.y} r={annotation.strokeWidth / 2} fill={annotation.color} />;
    }
    const path = annotation.points
      .map((point, index) => `${index === 0 ? "M" : "L"}${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
      .join(" ");
    return (
      <>
        <path
          d={path}
          stroke="transparent"
          strokeWidth={Math.max(MIN_INK_HIT_WIDTH, annotation.strokeWidth)}
          fill="none"
        />
        <path
          d={path}
          stroke={annotation.color}
          strokeWidth={annotation.strokeWidth}
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
      </>
    );
  },

  highlight: (annotation) => (
    <rect
      {...annotation.rect}
      fill={annotation.color}
      opacity={HIGHLIGHT_OPACITY}
      style={{ mixBlendMode: "multiply" }}
    />
  ),

  whiteout: (annotation) => <rect {...annotation.rect} fill={annotation.color} />,

  image: (annotation) => (
    <image href={annotation.dataUrl} {...annotation.rect} preserveAspectRatio="none" />
  ),
};

export function renderAnnotation(annotation: Annotation): ReactElement {
  const render = renderers[annotation.type] as Renderer<Annotation>;
  return render(annotation);
}
