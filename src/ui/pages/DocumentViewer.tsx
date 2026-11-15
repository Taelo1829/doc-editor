import { annotationsOnPage } from "../../core/document/DocumentState";
import { useEditorState } from "../EditorContext";
import { PageView } from "./PageView";
import { TextEditorOverlay } from "./TextEditorOverlay";

/** The scrolling column of editable pages. */
export function DocumentViewer() {
  const { document, ui } = useEditorState();
  const session = ui.textEdit;

  return (
    <main className="viewer" aria-label="Document">
      <div className="viewer-pages">
        {document.pages.map((page, index) => (
          <PageView
            key={page.id}
            page={page}
            pageNumber={index + 1}
            annotations={annotationsOnPage(document, page.id)}
            ui={ui}
            textEditor={
              session?.pageId === page.id ? (
                <TextEditorOverlay
                  key={`${session.annotationId ?? "new"}-${session.position.x}-${session.position.y}`}
                  session={session}
                  zoom={ui.zoom}
                />
              ) : null
            }
          />
        ))}
      </div>
    </main>
  );
}
