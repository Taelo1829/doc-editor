import { useState, type DragEvent } from "react";
import { MovePageCommand } from "../../core/commands/pageCommands";
import {
  annotationsOnPage,
  displaySize,
  effectiveRotation,
  type PageEntry,
} from "../../core/document/DocumentState";
import type { Annotation } from "../../core/annotations/types";
import { AnnotationGraphics } from "../annotations/AnnotationGraphics";
import { Icon } from "../components/Icon";
import { useEditorServices, useEditorState } from "../EditorContext";
import { PDF_ACCEPT, pickFile } from "../files/pickFile";
import { PageCanvas } from "../pages/PageCanvas";
import { pageElementId } from "../pages/PageView";

const THUMBNAIL_WIDTH = 132;

/** Page thumbnails: jump to, reorder by dragging, rotate, delete, add pages. */
export function PageSidebar() {
  const { store, actions } = useEditorServices();
  const { document, ui } = useEditorState();
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const [draggedId, setDraggedId] = useState<string | null>(null);

  const goToPage = (pageId: string) => {
    store.setActivePage(pageId);
    window.document.getElementById(pageElementId(pageId))?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleDrop = () => {
    if (draggedId !== null && dropIndex !== null) {
      const fromIndex = document.pages.findIndex((page) => page.id === draggedId);
      // Dropping below the page's own slot shifts the target up by one once it's removed.
      const target = dropIndex > fromIndex ? dropIndex - 1 : dropIndex;
      if (target !== fromIndex) {
        store.execute(new MovePageCommand(draggedId, target));
      }
    }
    setDraggedId(null);
    setDropIndex(null);
  };

  const appendPdf = async () => {
    const file = await pickFile(PDF_ACCEPT);
    if (file) {
      await actions.appendPdf(file);
    }
  };

  return (
    <aside className="sidebar" aria-label="Pages">
      <header className="panel-heading">
        <span>Pages</span>
        <span className="mono muted">{document.pages.length}</span>
      </header>
      <ol className="thumbnail-list" onDragOver={(event) => event.preventDefault()} onDrop={handleDrop}>
        {document.pages.map((page, index) => (
          <li key={page.id} className="thumbnail-slot">
            {dropIndex === index && <div className="drop-marker" />}
            <Thumbnail
              page={page}
              pageNumber={index + 1}
              annotations={annotationsOnPage(document, page.id)}
              isActive={ui.activePageId === page.id}
              isDragging={draggedId === page.id}
              onSelect={() => goToPage(page.id)}
              onDragStart={() => setDraggedId(page.id)}
              onDragEnd={() => {
                setDraggedId(null);
                setDropIndex(null);
              }}
              onDragOverHalf={(isLowerHalf) => setDropIndex(isLowerHalf ? index + 1 : index)}
              onRotateClockwise={() => actions.rotatePageClockwise(page.id)}
              onRotateAnticlockwise={() => actions.rotatePageAnticlockwise(page.id)}
              onDelete={() => actions.deletePage(page.id)}
            />
            {dropIndex === document.pages.length && index === document.pages.length - 1 && (
              <div className="drop-marker" />
            )}
          </li>
        ))}
      </ol>
      <footer className="sidebar-actions">
        <button type="button" className="button button-quiet" onClick={() => actions.insertBlankPageAfterActive()}>
          <Icon name="fileBlank" size={16} /> Blank page
        </button>
        <button type="button" className="button button-quiet" onClick={appendPdf}>
          <Icon name="filePlus" size={16} /> Add PDF
        </button>
      </footer>
    </aside>
  );
}

interface ThumbnailProps {
  readonly page: PageEntry;
  readonly pageNumber: number;
  readonly annotations: readonly Annotation[];
  readonly isActive: boolean;
  readonly isDragging: boolean;
  onSelect(): void;
  onDragStart(): void;
  onDragEnd(): void;
  onDragOverHalf(isLowerHalf: boolean): void;
  onRotateClockwise(): void;
  onRotateAnticlockwise(): void;
  onDelete(): void;
}

function Thumbnail(props: ThumbnailProps) {
  const { page, pageNumber, annotations } = props;
  const size = displaySize(page);
  const scale = THUMBNAIL_WIDTH / size.width;

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const bounds = event.currentTarget.getBoundingClientRect();
    props.onDragOverHalf(event.clientY > bounds.top + bounds.height / 2);
  };

  return (
    <div
      className="thumbnail"
      data-active={props.isActive || undefined}
      data-dragging={props.isDragging || undefined}
      draggable
      onDragStart={(event) => {
        event.dataTransfer.effectAllowed = "move";
        props.onDragStart();
      }}
      onDragEnd={props.onDragEnd}
      onDragOver={handleDragOver}
    >
      <button
        type="button"
        className="thumbnail-preview"
        onClick={props.onSelect}
        title={page.source.originLabel}
        aria-label={`Go to page ${pageNumber}`}
      >
        <div className="thumbnail-sheet" style={{ width: size.width * scale, height: size.height * scale }}>
          <PageCanvas source={page.source} rotation={effectiveRotation(page)} scale={scale} />
          <svg className="page-overlay" viewBox={`0 0 ${size.width} ${size.height}`} pointerEvents="none">
            <AnnotationGraphics annotations={annotations} scale={scale} />
          </svg>
        </div>
      </button>
      <div className="thumbnail-footer">
        <span className="mono">{pageNumber}</span>
        <div className="thumbnail-actions">
          <button type="button" className="icon-button" onClick={props.onRotateAnticlockwise} title="Rotate left">
            <Icon name="rotateCcw" size={14} />
          </button>
          <button type="button" className="icon-button" onClick={props.onRotateClockwise} title="Rotate right">
            <Icon name="rotateCw" size={14} />
          </button>
          <button type="button" className="icon-button icon-button-danger" onClick={props.onDelete} title="Delete page">
            <Icon name="trash" size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
