import { useEffect, useRef } from "react";
import { rotateSize, type Rotation } from "../../core/geometry";
import type { PageSource } from "../../core/pages/PageSource";
import { RenderCancelledError } from "../../pdf/PdfPageSource";
import { useNearViewport } from "./useNearViewport";

interface PageCanvasProps {
  readonly source: PageSource;
  readonly rotation: Rotation;
  /** Screen pixels per PDF point. */
  readonly scale: number;
}

/**
 * Draws a page's original content. Renders off-screen first and swaps the result in,
 * so zooming never flashes a blank page.
 */
export function PageCanvas({ source, rotation, scale }: PageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isNear = useNearViewport(canvasRef);
  const shown = rotateSize(source.size, rotation);

  useEffect(() => {
    if (!isNear) {
      return;
    }
    const controller = new AbortController();
    const offscreen = document.createElement("canvas");
    source
      .renderTo(offscreen, {
        scale,
        rotation,
        pixelRatio: window.devicePixelRatio || 1,
        signal: controller.signal,
      })
      .then(() => copyInto(canvasRef.current, offscreen, controller.signal))
      .catch(reportUnexpected);
    return () => controller.abort();
  }, [source, rotation, scale, isNear]);

  return (
    <canvas
      ref={canvasRef}
      className="page-canvas"
      style={{ width: shown.width * scale, height: shown.height * scale }}
    />
  );
}

function copyInto(target: HTMLCanvasElement | null, rendered: HTMLCanvasElement, signal: AbortSignal) {
  if (!target || signal.aborted) {
    return;
  }
  target.width = rendered.width;
  target.height = rendered.height;
  target.getContext("2d")?.drawImage(rendered, 0, 0);
}

function reportUnexpected(error: unknown) {
  if (!(error instanceof RenderCancelledError)) {
    console.error("Page render failed", error);
  }
}
