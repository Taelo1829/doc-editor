import { describe, expect, it } from "vitest";
import { PageCoordinateMapper } from "./PageCoordinateMapper";

// A portrait page, offset from the origin to prove the box offset is honoured.
const box = { x: 10, y: 20, width: 600, height: 800 };

describe("PageCoordinateMapper", () => {
  it("flips the y axis for an unrotated page", () => {
    const mapper = new PageCoordinateMapper(box, 0);
    expect(mapper.pointToPdf({ x: 0, y: 0 })).toEqual({ x: 10, y: 820 });
    expect(mapper.pointToPdf({ x: 600, y: 800 })).toEqual({ x: 610, y: 20 });
  });

  it("puts the page's bottom-left at the screen's top-left when turned 90°", () => {
    const mapper = new PageCoordinateMapper(box, 90);
    expect(mapper.displaySize).toEqual({ width: 800, height: 600 });
    expect(mapper.pointToPdf({ x: 0, y: 0 })).toEqual({ x: 10, y: 20 });
    expect(mapper.pointToPdf({ x: 800, y: 0 })).toEqual({ x: 10, y: 820 });
    expect(mapper.pointToPdf({ x: 0, y: 600 })).toEqual({ x: 610, y: 20 });
  });

  it("maps every screen corner to the matching page corner at 180°", () => {
    const mapper = new PageCoordinateMapper(box, 180);
    expect(mapper.pointToPdf({ x: 0, y: 0 })).toEqual({ x: 610, y: 20 });
    expect(mapper.pointToPdf({ x: 600, y: 800 })).toEqual({ x: 10, y: 820 });
  });

  it("puts the page's top-right at the screen's top-left when turned 270°", () => {
    const mapper = new PageCoordinateMapper(box, 270);
    expect(mapper.pointToPdf({ x: 0, y: 0 })).toEqual({ x: 610, y: 820 });
    expect(mapper.pointToPdf({ x: 800, y: 0 })).toEqual({ x: 610, y: 20 });
    expect(mapper.pointToPdf({ x: 0, y: 600 })).toEqual({ x: 10, y: 820 });
  });

  it("keeps rectangles axis-aligned with positive size", () => {
    const mapper = new PageCoordinateMapper(box, 90);
    expect(mapper.rectToPdf({ x: 100, y: 50, width: 200, height: 40 })).toEqual({
      x: 60,
      y: 120,
      width: 40,
      height: 200,
    });
  });
});
