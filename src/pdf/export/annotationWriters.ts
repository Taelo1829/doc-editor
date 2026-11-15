import {
  BlendMode,
  LineCapStyle,
  degrees,
  rgb,
  type PDFDocument,
  type PDFFont,
  type PDFPage,
  type RGB,
} from "@cantoo/pdf-lib";
import {
  HIGHLIGHT_OPACITY,
  TEXT_LAYOUT,
  splitTextLines,
  type Annotation,
  type AnnotationOfType,
  type AnnotationType,
  type HexColor,
  type ImageAnnotation,
} from "../../core/annotations/types";
import type { PageCoordinateMapper } from "../../core/coordinates/PageCoordinateMapper";

export interface WriteContext {
  readonly output: PDFDocument;
  readonly page: PDFPage;
  readonly mapper: PageCoordinateMapper;
  readonly font: PDFFont;
}

type AnnotationWriter<A extends Annotation> = (annotation: A, context: WriteContext) => Promise<void>;

type WriterRegistry = { [T in AnnotationType]: AnnotationWriter<AnnotationOfType<T>> };

/**
 * Draws each annotation type permanently into a PDF page.
 * A new annotation type needs one entry here.
 */
const writers: WriterRegistry = {
  text: async (annotation, { page, mapper, font }) => {
    const lineHeight = annotation.fontSize * TEXT_LAYOUT.lineHeight;
    const encodable = encodableText(font);
    splitTextLines(annotation.text).forEach((line, index) => {
      const baseline = mapper.pointToPdf({
        x: annotation.position.x,
        y: annotation.position.y + index * lineHeight + annotation.fontSize * TEXT_LAYOUT.baselineOffset,
      });
      page.drawText(encodable(line), {
        x: baseline.x,
        y: baseline.y,
        size: annotation.fontSize,
        font,
        color: toRgb(annotation.color),
        rotate: degrees(mapper.uprightAngle),
      });
    });
  },

  ink: async (annotation, { page, mapper }) => {
    const color = toRgb(annotation.color);
    const points = annotation.points.map((point) => mapper.pointToPdf(point));
    const [first] = points;
    if (points.length === 1 && first) {
      page.drawCircle({ x: first.x, y: first.y, size: annotation.strokeWidth / 2, color });
      return;
    }
    points.slice(1).forEach((end, index) => {
      page.drawLine({
        start: points[index] ?? end,
        end,
        thickness: annotation.strokeWidth,
        color,
        lineCap: LineCapStyle.Round,
      });
    });
  },

  highlight: async (annotation, { page, mapper }) => {
    const rect = mapper.rectToPdf(annotation.rect);
    page.drawRectangle({
      ...rect,
      color: toRgb(annotation.color),
      opacity: HIGHLIGHT_OPACITY,
      blendMode: BlendMode.Multiply,
    });
  },

  whiteout: async (annotation, { page, mapper }) => {
    page.drawRectangle({ ...mapper.rectToPdf(annotation.rect), color: toRgb(annotation.color) });
  },

  image: async (annotation, { output, page, mapper }) => {
    const image = await embedImage(output, annotation);
    // pdf-lib rotates images about their bottom-left corner, so anchor there.
    const anchor = mapper.pointToPdf({
      x: annotation.rect.x,
      y: annotation.rect.y + annotation.rect.height,
    });
    page.drawImage(image, {
      x: anchor.x,
      y: anchor.y,
      width: annotation.rect.width,
      height: annotation.rect.height,
      rotate: degrees(mapper.uprightAngle),
    });
  },
};

export async function writeAnnotation(annotation: Annotation, context: WriteContext): Promise<void> {
  const writer = writers[annotation.type] as AnnotationWriter<Annotation>;
  await writer(annotation, context);
}

function toRgb(hex: HexColor): RGB {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  return rgb(((value >> 16) & 255) / 255, ((value >> 8) & 255) / 255, (value & 255) / 255);
}

async function embedImage(output: PDFDocument, annotation: ImageAnnotation) {
  const bytes = dataUrlToBytes(annotation.dataUrl);
  return annotation.mimeType === "image/png" ? output.embedPng(bytes) : output.embedJpg(bytes);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

/**
 * The built-in PDF fonts only cover Western European characters. Anything else
 * would make the export fail, so it is swapped for a question mark instead.
 */
function encodableText(font: PDFFont): (text: string) => string {
  const supported = new Set(font.getCharacterSet());
  return (text) =>
    Array.from(text, (char) => (supported.has(char.codePointAt(0) ?? -1) ? char : "?")).join("");
}
