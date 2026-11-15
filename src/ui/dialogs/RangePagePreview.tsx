import {
  annotationsOnPage,
  displaySize,
  effectiveRotation,
  type DocumentState,
} from "../../core/document/DocumentState";
import { AnnotationGraphics } from "../annotations/AnnotationGraphics";
import { PageCanvas } from "../pages/PageCanvas";

export function RangePagePreview({ document, pageNumber, label }: {
  readonly document: DocumentState;
  readonly pageNumber: number;
  readonly label: string;
}) {
  const page = Number.isInteger(pageNumber) ? document.pages[pageNumber - 1] : undefined;
  const size = page ? displaySize(page) : null;
  const scale = size ? Math.min(160 / size.width, 220 / size.height) : 1;

  return (
    <figure className="range-page-preview">
      <figcaption>{label}{page ? ` · Page ${pageNumber}` : ""}</figcaption>
      <div className="range-page-preview-stage">
        {page && size ? (
          <div className="thumbnail-sheet" role="img" aria-label={`${label}, page ${pageNumber}`}
            style={{ width: size.width * scale, height: size.height * scale }}>
            <PageCanvas key={page.id} source={page.source} rotation={effectiveRotation(page)} scale={scale} />
            <svg className="page-overlay" viewBox={`0 0 ${size.width} ${size.height}`} pointerEvents="none" aria-hidden="true">
              <AnnotationGraphics annotations={annotationsOnPage(document, page.id)} scale={scale} />
            </svg>
          </div>
        ) : <span className="muted">Enter a valid page number</span>}
      </div>
    </figure>
  );
}
