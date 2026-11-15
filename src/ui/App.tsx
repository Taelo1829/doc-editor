import { useEffect, useState, type DragEvent } from "react";
import { hasDocument } from "../core/document/DocumentState";
import { Icon } from "./components/Icon";
import { DialogHost } from "./dialogs/DialogHost";
import { useEditorServices, useEditorState } from "./EditorContext";
import { PDF_ACCEPT, isPdfFile, pickFile } from "./files/pickFile";
import { DocumentViewer } from "./pages/DocumentViewer";
import { PropertiesPanel } from "./properties/PropertiesPanel";
import { PageSidebar } from "./sidebar/PageSidebar";
import { TopBar } from "./toolbar/TopBar";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";

export function App() {
  const { store, actions } = useEditorServices();
  const { document, hasUnsavedChanges } = useEditorState();
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const isOpen = hasDocument(document);

  useKeyboardShortcuts(store, actions);
  useWarnBeforeLeaving(hasUnsavedChanges);

  const handleDrop = async (event: DragEvent) => {
    event.preventDefault();
    setIsDraggingFile(false);
    if (!isFileDrag(event)) {
      return; // e.g. a page thumbnail being reordered
    }
    const file = Array.from(event.dataTransfer.files).find(isPdfFile);
    if (!file) {
      store.showNotice("Drop a PDF file to open it.");
      return;
    }
    await (isOpen ? actions.appendPdf(file) : actions.openPdf(file));
  };

  const handleDragOver = (event: DragEvent) => {
    if (isFileDrag(event)) {
      event.preventDefault();
      setIsDraggingFile(true);
    }
  };

  return (
    <div
      className="app"
      onDragOver={handleDragOver}
      onDragLeave={(event) => event.currentTarget === event.target && setIsDraggingFile(false)}
      onDrop={handleDrop}
    >
      <TopBar />
      {isOpen ? (
        <div className="workspace">
          <PageSidebar />
          <DocumentViewer />
          <PropertiesPanel />
        </div>
      ) : (
        <EmptyState />
      )}
      {isDraggingFile && (
        <div className="drop-overlay">
          <p>{isOpen ? "Drop to add these pages at the end" : "Drop to open"}</p>
        </div>
      )}
      <Notice />
      <DialogHost />
    </div>
  );
}

function isFileDrag(event: DragEvent): boolean {
  return event.dataTransfer.types.includes("Files");
}

function EmptyState() {
  const { actions } = useEditorServices();
  const openPdf = async () => {
    const file = await pickFile(PDF_ACCEPT);
    if (file) {
      await actions.openPdf(file);
    }
  };
  return (
    <div className="empty-state">
      <div className="empty-card">
        <div className="empty-sheet" aria-hidden="true">
          <span />
          <span />
          <span className="empty-mark" />
          <span />
        </div>
        <h1>Edit a PDF</h1>
        <p>
          Add text, draw, highlight, cover content, place images and signatures, and rearrange
          pages. Everything stays on your computer — nothing is uploaded.
        </p>
        <button type="button" className="button button-primary button-large" onClick={openPdf}>
          <Icon name="open" /> Open a PDF
        </button>
        <p className="muted small">or drop a file anywhere</p>
      </div>
    </div>
  );
}

const NOTICE_DURATION_MS = 4000;

function Notice() {
  const { store } = useEditorServices();
  const { ui } = useEditorState();

  useEffect(() => {
    if (!ui.notice) {
      return;
    }
    const timer = setTimeout(() => store.dismissNotice(), NOTICE_DURATION_MS);
    return () => clearTimeout(timer);
  }, [ui.notice, store]);

  if (!ui.notice) {
    return null;
  }
  return (
    <div className="notice" role="status">
      <span>{ui.notice}</span>
      <button type="button" className="icon-button" onClick={() => store.dismissNotice()} aria-label="Dismiss">
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}

function useWarnBeforeLeaving(hasUnsavedChanges: boolean): void {
  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasUnsavedChanges]);
}
