export interface Point {
  readonly x: number;
  readonly y: number;
}

export interface Size {
  readonly width: number;
  readonly height: number;
}

export interface Rect extends Point, Size {}

/** Page rotation in degrees, clockwise, as used by the PDF /Rotate entry. */
export type Rotation = 0 | 90 | 180 | 270;

export function normalizeRotation(degrees: number): Rotation {
  const normalized = (((Math.round(degrees / 90) * 90) % 360) + 360) % 360;
  return normalized as Rotation;
}

export function isQuarterTurnSideways(rotation: Rotation): boolean {
  return rotation === 90 || rotation === 270;
}

/** Size of a page as it appears on screen once rotation is applied. */
export function rotateSize(size: Size, rotation: Rotation): Size {
  if (isQuarterTurnSideways(rotation)) {
    return { width: size.height, height: size.width };
  }
  return size;
}

/** Builds the smallest rect that contains both points, whatever order they are in. */
export function rectFromCorners(a: Point, b: Point): Rect {
  return {
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    width: Math.abs(a.x - b.x),
    height: Math.abs(a.y - b.y),
  };
}

export function translatePoint(point: Point, dx: number, dy: number): Point {
  return { x: point.x + dx, y: point.y + dy };
}

export function translateRect(rect: Rect, dx: number, dy: number): Rect {
  return { ...rect, x: rect.x + dx, y: rect.y + dy };
}

export function rectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

/**
 * Where a point on a page lands after the page turns 90° clockwise.
 * `pageSize` is the page's on-screen size before the turn.
 */
export function rotatePointClockwise(point: Point, pageSize: Size): Point {
  return { x: pageSize.height - point.y, y: point.x };
}

/** The region a rect covers after the page turns 90° clockwise. */
export function rotateRectClockwise(rect: Rect, pageSize: Size): Rect {
  return {
    x: pageSize.height - (rect.y + rect.height),
    y: rect.x,
    width: rect.height,
    height: rect.width,
  };
}

/** Moves an upright box so its centre follows a 90° clockwise page turn, keeping its size. */
export function rotateUprightBoxClockwise(rect: Rect, pageSize: Size): Rect {
  const center = rotatePointClockwise(rectCenter(rect), pageSize);
  return {
    x: center.x - rect.width / 2,
    y: center.y - rect.height / 2,
    width: rect.width,
    height: rect.height,
  };
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
