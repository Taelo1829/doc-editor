import type { Point, Rect } from "../geometry";

/** Hex colour, e.g. "#1f6feb". */
export type HexColor = string;

interface AnnotationBase {
  readonly id: string;
  readonly pageId: string;
}

export interface TextAnnotation extends AnnotationBase {
  readonly type: "text";
  /** Top-left corner of the first line, in page points. */
  readonly position: Point;
  readonly text: string;
  readonly fontSize: number;
  readonly color: HexColor;
}

export interface InkAnnotation extends AnnotationBase {
  readonly type: "ink";
  readonly points: readonly Point[];
  readonly strokeWidth: number;
  readonly color: HexColor;
}

export interface HighlightAnnotation extends AnnotationBase {
  readonly type: "highlight";
  readonly rect: Rect;
  readonly color: HexColor;
}

/** An opaque box used to cover existing content before writing over it. */
export interface WhiteoutAnnotation extends AnnotationBase {
  readonly type: "whiteout";
  readonly rect: Rect;
  readonly color: HexColor;
}

export type ImageMimeType = "image/png" | "image/jpeg";

export interface ImageAnnotation extends AnnotationBase {
  readonly type: "image";
  readonly rect: Rect;
  readonly dataUrl: string;
  readonly mimeType: ImageMimeType;
}

export type Annotation =
  | TextAnnotation
  | InkAnnotation
  | HighlightAnnotation
  | WhiteoutAnnotation
  | ImageAnnotation;

export type AnnotationType = Annotation["type"];

export type AnnotationOfType<T extends AnnotationType> = Extract<Annotation, { type: T }>;

export const HIGHLIGHT_OPACITY = 0.38;

/** Shared text layout so the screen and the exported PDF place lines identically. */
export const TEXT_LAYOUT = {
  lineHeight: 1.2,
  /** Distance from the top of a line box to its baseline, as a multiple of font size. */
  baselineOffset: 1.0,
} as const;

export function splitTextLines(text: string): string[] {
  return text.split(/\r?\n/);
}

export function textBlockHeight(annotation: TextAnnotation): number {
  return splitTextLines(annotation.text).length * annotation.fontSize * TEXT_LAYOUT.lineHeight;
}
