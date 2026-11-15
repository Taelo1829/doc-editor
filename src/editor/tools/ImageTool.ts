import type { ImageAnnotation } from "../../core/annotations/types";
import { AddAnnotationCommand } from "../../core/commands/annotationCommands";
import { clamp, type Size } from "../../core/geometry";
import { createId } from "../../core/ids";
import type { EditorStore } from "../../core/store/EditorStore";
import type { PendingImage } from "../../core/store/uiState";
import { BaseTool, type PagePointer } from "./Tool";

/** Images start no wider than this share of the page, so a huge photo still fits. */
const MAX_INITIAL_PAGE_SHARE = 0.4;
/** Screen pixels are 96 per inch; PDF points are 72. */
const PIXELS_TO_POINTS = 72 / 96;

export class ImageTool extends BaseTool {
  readonly id = "image";
  readonly label = "Image";
  readonly shortcut = "I";
  readonly hint = "Click on a page to place the image you picked.";
  override readonly cursor = "copy";

  override pointerDown(pointer: PagePointer, store: EditorStore): void {
    const image = store.getSnapshot().ui.pendingImage;
    if (!image) {
      store.showNotice("Pick an image first — use the Image button in the toolbar.");
      return;
    }
    const annotation = this.placeImage(image, pointer);
    store.execute(new AddAnnotationCommand(annotation));
    store.clearPendingImage();
    store.selectTool("select");
    store.selectAnnotation(annotation.id);
  }

  private placeImage(image: PendingImage, pointer: PagePointer): ImageAnnotation {
    const size = this.initialSize(image, pointer.pageSize);
    return {
      id: createId("img"),
      pageId: pointer.pageId,
      type: "image",
      dataUrl: image.dataUrl,
      mimeType: image.mimeType,
      rect: {
        x: pointer.point.x - size.width / 2,
        y: pointer.point.y - size.height / 2,
        ...size,
      },
    };
  }

  private initialSize(image: PendingImage, pageSize: Size): Size {
    const naturalWidth = image.width * PIXELS_TO_POINTS;
    const width = clamp(naturalWidth, 24, pageSize.width * MAX_INITIAL_PAGE_SHARE);
    return { width, height: width * (image.height / image.width) };
  }
}
