/** Matches the PDF's built-in Helvetica as closely as screen fonts allow. */
export const ANNOTATION_FONT_FAMILY = "Helvetica, Arial, 'Liberation Sans', sans-serif";

let measuringContext: CanvasRenderingContext2D | null = null;

function context(): CanvasRenderingContext2D | null {
  measuringContext ??= document.createElement("canvas").getContext("2d");
  return measuringContext;
}

/** Width of a single line of annotation text, in the same units as `fontSize`. */
export function measureTextWidth(text: string, fontSize: number): number {
  const ctx = context();
  if (!ctx) {
    return text.length * fontSize * 0.5;
  }
  ctx.font = `${fontSize}px ${ANNOTATION_FONT_FAMILY}`;
  return ctx.measureText(text).width;
}
