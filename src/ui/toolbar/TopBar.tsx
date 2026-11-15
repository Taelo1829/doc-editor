import { hasDocument } from "../../core/document/DocumentState";
import type { ToolId } from "../../core/store/uiState";
import { TOOLS } from "../../editor/tools/toolRegistry";
import { Icon } from "../components/Icon";
import { useEditorServices, useEditorState } from "../EditorContext";
import { IMAGE_ACCEPT, PDF_ACCEPT, pickFile } from "../files/pickFile";

export function TopBar() {
  const { store, actions } = useEditorServices();
  const snapshot = useEditorState();
  const { document, ui } = snapshot;
  const isOpen = hasDocument(document);

  const openPdf = async () => {
    const file = await pickFile(PDF_ACCEPT);
    if (file) {
      await actions.openPdf(file);
    }
  };

  const chooseTool = async (toolId: ToolId) => {
    if (toolId !== "image") {
      store.selectTool(toolId);
      return;
    }
    const file = await pickFile(IMAGE_ACCEPT);
    if (file) {
      await actions.chooseImage(file);
    }
  };

  return (
    <header className="topbar">
      <div className="topbar-section">
        <span className="brand" aria-label="Doc Editor">
          doc<span className="brand-dot">·</span>editor
        </span>
        {isOpen && (
          <span className="file-name" title={document.fileName}>
            {document.fileName}
            {snapshot.hasUnsavedChanges && <span className="unsaved-dot" title="Unsaved changes" />}
          </span>
        )}
      </div>

      {isOpen && (
        <nav className="tool-group" aria-label="Tools">
          {TOOLS.map((tool) => (
            <button
              key={tool.id}
              type="button"
              className="tool-button"
              aria-pressed={ui.activeTool === tool.id}
              title={`${tool.label} (${tool.shortcut}) — ${tool.hint}`}
              onClick={() => chooseTool(tool.id)}
            >
              <Icon name={tool.id} />
              <span className="tool-label">{tool.label}</span>
            </button>
          ))}
        </nav>
      )}

      <div className="topbar-section topbar-end">
        {isOpen && (
          <>
            <div className="button-cluster">
              <button
                type="button"
                className="icon-button"
                disabled={!snapshot.canUndo}
                onClick={() => store.undo()}
                title={snapshot.undoLabel ? `Undo ${snapshot.undoLabel.toLowerCase()} (Ctrl+Z)` : "Undo"}
              >
                <Icon name="undo" />
              </button>
              <button
                type="button"
                className="icon-button"
                disabled={!snapshot.canRedo}
                onClick={() => store.redo()}
                title={snapshot.redoLabel ? `Redo ${snapshot.redoLabel.toLowerCase()} (Ctrl+Y)` : "Redo"}
              >
                <Icon name="redo" />
              </button>
            </div>
            <div className="button-cluster zoom">
              <button type="button" className="icon-button" onClick={() => actions.zoomOut()} title="Zoom out (−)">
                <Icon name="minus" />
              </button>
              <span className="mono zoom-value">{Math.round(ui.zoom * 100)}%</span>
              <button type="button" className="icon-button" onClick={() => actions.zoomIn()} title="Zoom in (+)">
                <Icon name="plus" />
              </button>
            </div>
          </>
        )}
        <button type="button" className="button button-quiet" onClick={openPdf} title="Open a PDF (Ctrl+O)">
          <Icon name="open" size={16} /> Open
        </button>
        {isOpen && (
          <button type="button" className="button button-quiet" onClick={() => actions.splitByRange()} title="Save a page range as a separate PDF">
            Split by range
          </button>
        )}
        {isOpen && (
          <button type="button" className="button button-primary" onClick={() => actions.save()} title="Save as PDF (Ctrl+S)">
            <Icon name="save" size={16} /> Save PDF
          </button>
        )}
      </div>
    </header>
  );
}
