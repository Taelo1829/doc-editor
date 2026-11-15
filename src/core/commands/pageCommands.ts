import { rotateAnnotationClockwise } from "../annotations/geometry";
import {
  displaySize,
  findPage,
  type DocumentState,
  type PageEntry,
} from "../document/DocumentState";
import { clamp, normalizeRotation } from "../geometry";
import type { DocumentCommand } from "./Command";

function indexOfPage(state: DocumentState, pageId: string): number {
  findPage(state, pageId);
  return state.pages.findIndex((page) => page.id === pageId);
}

export class InsertPagesCommand implements DocumentCommand {
  readonly label: string;

  /** `atIndex` is clamped, so passing the page count appends to the end. */
  constructor(
    private readonly pages: readonly PageEntry[],
    private readonly atIndex: number,
  ) {
    this.label = pages.length === 1 ? "Insert page" : `Insert ${pages.length} pages`;
  }

  apply(state: DocumentState): DocumentState {
    const index = clamp(this.atIndex, 0, state.pages.length);
    return {
      ...state,
      pages: [...state.pages.slice(0, index), ...this.pages, ...state.pages.slice(index)],
    };
  }
}

export class DeletePageCommand implements DocumentCommand {
  readonly label = "Delete page";

  constructor(private readonly pageId: string) {}

  apply(state: DocumentState): DocumentState {
    findPage(state, this.pageId);
    return {
      ...state,
      pages: state.pages.filter((page) => page.id !== this.pageId),
      annotations: state.annotations.filter((annotation) => annotation.pageId !== this.pageId),
    };
  }
}

export class MovePageCommand implements DocumentCommand {
  readonly label = "Reorder pages";

  /** Moves the page so it ends up at `toIndex` in the resulting list. */
  constructor(
    private readonly pageId: string,
    private readonly toIndex: number,
  ) {}

  apply(state: DocumentState): DocumentState {
    const fromIndex = indexOfPage(state, this.pageId);
    const remaining = state.pages.filter((page) => page.id !== this.pageId);
    const target = clamp(this.toIndex, 0, remaining.length);
    const moved = state.pages[fromIndex] as PageEntry;
    return {
      ...state,
      pages: [...remaining.slice(0, target), moved, ...remaining.slice(target)],
    };
  }
}

/**
 * Turns a page by whole quarter turns clockwise (use 3 for anticlockwise).
 * Annotations on the page follow it, so they stay over the same content.
 */
export class RotatePageCommand implements DocumentCommand {
  readonly label = "Rotate page";

  constructor(
    private readonly pageId: string,
    private readonly clockwiseQuarterTurns: 1 | 2 | 3,
  ) {}

  apply(state: DocumentState): DocumentState {
    let next = state;
    for (let turn = 0; turn < this.clockwiseQuarterTurns; turn++) {
      next = this.turnOnceClockwise(next);
    }
    return next;
  }

  private turnOnceClockwise(state: DocumentState): DocumentState {
    const page = findPage(state, this.pageId);
    const sizeBeforeTurn = displaySize(page);
    return {
      ...state,
      pages: state.pages.map((candidate) =>
        candidate.id === this.pageId
          ? { ...candidate, userRotation: normalizeRotation(candidate.userRotation + 90) }
          : candidate,
      ),
      annotations: state.annotations.map((annotation) =>
        annotation.pageId === this.pageId
          ? rotateAnnotationClockwise(annotation, sizeBeforeTurn)
          : annotation,
      ),
    };
  }
}
