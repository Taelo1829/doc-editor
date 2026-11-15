import { rectFromCorners, rotateSize, type Point, type Rect, type Rotation, type Size } from "../geometry";

/** A page box in PDF user space: origin bottom-left, y pointing up. */
export interface PdfBox extends Rect {}

type ToPdf = (display: Point, box: PdfBox) => Point;

/**
 * Converts from on-screen page coordinates (origin top-left, y down, page shown
 * after rotation) to PDF user space for one rotation. Each entry is a closed form
 * of rotating the page box clockwise by that many degrees.
 */
const TO_PDF_BY_ROTATION: Record<Rotation, ToPdf> = {
  0: (d, box) => ({ x: box.x + d.x, y: box.y + box.height - d.y }),
  90: (d, box) => ({ x: box.x + d.y, y: box.y + d.x }),
  180: (d, box) => ({ x: box.x + box.width - d.x, y: box.y + d.y }),
  270: (d, box) => ({ x: box.x + box.width - d.y, y: box.y + box.height - d.x }),
};

export class PageCoordinateMapper {
  private readonly toPdf: ToPdf;

  constructor(
    private readonly box: PdfBox,
    readonly rotation: Rotation,
  ) {
    this.toPdf = TO_PDF_BY_ROTATION[rotation];
  }

  get displaySize(): Size {
    return rotateSize(this.box, this.rotation);
  }

  /**
   * The angle, in degrees anticlockwise, of the screen's "rightwards" direction once
   * mapped into PDF space. Text and images drawn upright on screen use it.
   */
  get uprightAngle(): number {
    return this.rotation;
  }

  pointToPdf(display: Point): Point {
    return this.toPdf(display, this.box);
  }

  rectToPdf(display: Rect): Rect {
    const topLeft = this.pointToPdf(display);
    const bottomRight = this.pointToPdf({ x: display.x + display.width, y: display.y + display.height });
    return rectFromCorners(topLeft, bottomRight);
  }
}
