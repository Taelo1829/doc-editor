import type { Annotation } from "../annotations/types";
import { normalizeRotation, rotateSize, type Rotation, type Size } from "../geometry";
import type { PageSource } from "../pages/PageSource";

export interface PageEntry {
  readonly id: string;
  readonly source: PageSource;
  /** Extra clockwise rotation the user applied on top of the source's own rotation. */
  readonly userRotation: Rotation;
}

/** Everything that ends up in the saved PDF. Immutable: every edit produces a new state. */
export interface DocumentState {
  readonly fileName: string;
  readonly pages: readonly PageEntry[];
  /** Drawn in order, so later annotations sit on top. */
  readonly annotations: readonly Annotation[];
}

export const EMPTY_DOCUMENT: DocumentState = {
  fileName: "",
  pages: [],
  annotations: [],
};

export function effectiveRotation(page: PageEntry): Rotation {
  return normalizeRotation(page.source.intrinsicRotation + page.userRotation);
}

/** The page's size as it appears on screen, in PDF points. */
export function displaySize(page: PageEntry): Size {
  return rotateSize(page.source.size, effectiveRotation(page));
}

export function findPage(state: DocumentState, pageId: string): PageEntry {
  const page = state.pages.find((candidate) => candidate.id === pageId);
  if (!page) {
    throw new Error(`Page ${pageId} does not exist`);
  }
  return page;
}

export function findAnnotation(state: DocumentState, annotationId: string): Annotation {
  const annotation = state.annotations.find((candidate) => candidate.id === annotationId);
  if (!annotation) {
    throw new Error(`Annotation ${annotationId} does not exist`);
  }
  return annotation;
}

export function annotationsOnPage(state: DocumentState, pageId: string): Annotation[] {
  return state.annotations.filter((annotation) => annotation.pageId === pageId);
}

/**
 * The password of the first password-protected file the document's pages came from,
 * or null if none of them needed one. Used to offer keeping the protection on save.
 */
export function originalPassword(state: DocumentState): string | null {
  return state.pages.find((page) => page.source.openedWithPassword !== null)?.source.openedWithPassword ?? null;
}

export function hasDocument(state: DocumentState): boolean {
  return state.pages.length > 0;
}
