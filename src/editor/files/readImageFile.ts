import type { ImageMimeType } from "../../core/annotations/types";
import type { PendingImage } from "../../core/store/uiState";

const PDF_READY_TYPES: ReadonlySet<string> = new Set<ImageMimeType>(["image/png", "image/jpeg"]);

/**
 * Reads an image file for placing on a page. PDFs can only embed PNG and JPEG,
 * so other formats (WebP, GIF, SVG…) are converted to PNG first.
 */
export async function readImageFile(file: File): Promise<PendingImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error(`${file.name} isn't an image.`);
  }
  const dataUrl = await readAsDataUrl(file);
  const element = await loadImage(dataUrl);
  const size = { width: element.naturalWidth, height: element.naturalHeight };

  if (PDF_READY_TYPES.has(file.type)) {
    return { dataUrl, mimeType: file.type as ImageMimeType, ...size };
  }
  return { dataUrl: convertToPng(element), mimeType: "image/png", ...size };
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Couldn't read ${file.name}.`));
    reader.readAsDataURL(file);
  });
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That image couldn't be loaded."));
    image.src = source;
  });
}

function convertToPng(image: HTMLImageElement): string {
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  canvas.getContext("2d")?.drawImage(image, 0, 0);
  return canvas.toDataURL("image/png");
}
