import { resizeAnnotation, translateAnnotation } from "../annotations/geometry";
import type { Annotation } from "../annotations/types";
import { findAnnotation, type DocumentState } from "../document/DocumentState";
import type { Rect } from "../geometry";
import type { DocumentCommand } from "./Command";

function replaceAnnotation(
  state: DocumentState,
  annotationId: string,
  update: (annotation: Annotation) => Annotation,
): DocumentState {
  findAnnotation(state, annotationId);
  return {
    ...state,
    annotations: state.annotations.map((annotation) =>
      annotation.id === annotationId ? update(annotation) : annotation,
    ),
  };
}

export class AddAnnotationCommand implements DocumentCommand {
  readonly label = "Add annotation";

  constructor(private readonly annotation: Annotation) {}

  apply(state: DocumentState): DocumentState {
    return { ...state, annotations: [...state.annotations, this.annotation] };
  }
}

export class RemoveAnnotationCommand implements DocumentCommand {
  readonly label = "Delete annotation";

  constructor(private readonly annotationId: string) {}

  apply(state: DocumentState): DocumentState {
    findAnnotation(state, this.annotationId);
    return {
      ...state,
      annotations: state.annotations.filter((annotation) => annotation.id !== this.annotationId),
    };
  }
}

/** Changes plain properties such as colour, text or font size. */
export class UpdateAnnotationCommand<A extends Annotation> implements DocumentCommand {
  readonly label = "Edit annotation";

  constructor(
    private readonly annotationId: string,
    private readonly changes: Partial<Omit<A, "id" | "type" | "pageId">>,
  ) {}

  apply(state: DocumentState): DocumentState {
    return replaceAnnotation(state, this.annotationId, (annotation) => ({
      ...annotation,
      ...this.changes,
    }) as Annotation);
  }
}

export class MoveAnnotationCommand implements DocumentCommand {
  readonly label = "Move annotation";

  constructor(
    private readonly annotationId: string,
    private readonly dx: number,
    private readonly dy: number,
  ) {}

  apply(state: DocumentState): DocumentState {
    return replaceAnnotation(state, this.annotationId, (annotation) =>
      translateAnnotation(annotation, this.dx, this.dy),
    );
  }
}

export class ResizeAnnotationCommand implements DocumentCommand {
  readonly label = "Resize annotation";

  constructor(
    private readonly annotationId: string,
    private readonly rect: Rect,
  ) {}

  apply(state: DocumentState): DocumentState {
    return replaceAnnotation(state, this.annotationId, (annotation) =>
      resizeAnnotation(annotation, this.rect),
    );
  }
}
