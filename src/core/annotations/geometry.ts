import {
  rotatePointClockwise,
  rotateRectClockwise,
  rotateUprightBoxClockwise,
  translatePoint,
  translateRect,
  type Rect,
  type Size,
} from "../geometry";
import {
  textBlockHeight,
  type Annotation,
  type AnnotationOfType,
  type AnnotationType,
} from "./types";

/**
 * How each kind of annotation moves around a page.
 * Adding a new annotation type means adding one entry to the registry below;
 * nothing else in the editor needs to change.
 */
interface AnnotationGeometry<A extends Annotation> {
  translate(annotation: A, dx: number, dy: number): A;
  /** Re-places the annotation after its page turns 90° clockwise. */
  rotateClockwise(annotation: A, pageSize: Size): A;
  /** The box a user can resize, or null when the kind cannot be resized. */
  resizableRect(annotation: A): Rect | null;
  withRect(annotation: A, rect: Rect): A;
}

type GeometryRegistry = { [T in AnnotationType]: AnnotationGeometry<AnnotationOfType<T>> };

const notResizable = {
  resizableRect: () => null,
  withRect: <A>(annotation: A) => annotation,
};

function rectGeometry<A extends Annotation & { rect: Rect }>(
  rotate: (rect: Rect, pageSize: Size) => Rect,
): AnnotationGeometry<A> {
  return {
    translate: (annotation, dx, dy) => ({ ...annotation, rect: translateRect(annotation.rect, dx, dy) }),
    rotateClockwise: (annotation, pageSize) => ({ ...annotation, rect: rotate(annotation.rect, pageSize) }),
    resizableRect: (annotation) => annotation.rect,
    withRect: (annotation, rect) => ({ ...annotation, rect }),
  };
}

const registry: GeometryRegistry = {
  text: {
    translate: (annotation, dx, dy) => ({
      ...annotation,
      position: translatePoint(annotation.position, dx, dy),
    }),
    rotateClockwise: (annotation, pageSize) => {
      // Text stays upright; its anchor follows the page.
      const turnedCorner = rotatePointClockwise(annotation.position, pageSize);
      return {
        ...annotation,
        position: { x: turnedCorner.x - textBlockHeight(annotation), y: turnedCorner.y },
      };
    },
    ...notResizable,
  },
  ink: {
    translate: (annotation, dx, dy) => ({
      ...annotation,
      points: annotation.points.map((point) => translatePoint(point, dx, dy)),
    }),
    rotateClockwise: (annotation, pageSize) => ({
      ...annotation,
      points: annotation.points.map((point) => rotatePointClockwise(point, pageSize)),
    }),
    ...notResizable,
  },
  // Highlights and white-outs cover page content, so they turn with it.
  highlight: rectGeometry(rotateRectClockwise),
  whiteout: rectGeometry(rotateRectClockwise),
  // Images (signatures, stamps) stay upright and follow the page by their centre.
  image: rectGeometry(rotateUprightBoxClockwise),
};

function geometryFor<A extends Annotation>(annotation: A): AnnotationGeometry<A> {
  return registry[annotation.type] as unknown as AnnotationGeometry<A>;
}

export function translateAnnotation<A extends Annotation>(annotation: A, dx: number, dy: number): A {
  return geometryFor(annotation).translate(annotation, dx, dy);
}

export function rotateAnnotationClockwise<A extends Annotation>(annotation: A, pageSize: Size): A {
  return geometryFor(annotation).rotateClockwise(annotation, pageSize);
}

export function getResizableRect(annotation: Annotation): Rect | null {
  return geometryFor(annotation).resizableRect(annotation);
}

export function resizeAnnotation<A extends Annotation>(annotation: A, rect: Rect): A {
  return geometryFor(annotation).withRect(annotation, rect);
}
