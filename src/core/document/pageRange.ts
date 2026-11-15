import type { DocumentState } from "./DocumentState";

export interface PageRange {
  readonly start: number;
  readonly end: number;
}

export function pageRangeError({ start, end }: PageRange, pageCount: number): string | null {
  if (!Number.isInteger(start) || !Number.isInteger(end)) {
    return "Enter whole page numbers for both fields.";
  }
  if (start < 1 || end < 1 || start > pageCount || end > pageCount) {
    return `Choose pages between 1 and ${pageCount}.`;
  }
  if (start > end) {
    return "The end page must be on or after the start page.";
  }
  return null;
}

/** Uses the current page order and includes both endpoints. */
export function extractPageRange(document: DocumentState, range: PageRange): DocumentState {
  const error = pageRangeError(range, document.pages.length);
  if (error) throw new Error(error);
  const pages = document.pages.slice(range.start - 1, range.end);
  const pageIds = new Set(pages.map((page) => page.id));
  const base = document.fileName.replace(/\.pdf$/i, "") || "document";
  return {
    fileName: `${base}-pages-${range.start}-${range.end}.pdf`,
    pages,
    annotations: document.annotations.filter((annotation) => pageIds.has(annotation.pageId)),
  };
}
