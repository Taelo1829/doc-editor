import { useEffect } from "react";
import { hasDocument } from "../core/document/DocumentState";
import type { EditorStore } from "../core/store/EditorStore";
import type { EditorActions } from "../editor/EditorActions";
import { TOOLS } from "../editor/tools/toolRegistry";
import { PDF_ACCEPT, pickFile } from "./files/pickFile";

interface Shortcut {
  matches(event: KeyboardEvent): boolean;
  run(): void;
}

function withCommand(key: string) {
  return (event: KeyboardEvent) => (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === key;
}

function plainKey(...keys: string[]) {
  return (event: KeyboardEvent) => !event.ctrlKey && !event.metaKey && !event.altKey && keys.includes(event.key);
}

function buildShortcuts(store: EditorStore, actions: EditorActions): Shortcut[] {
  const openPdf = async () => {
    const file = await pickFile(PDF_ACCEPT);
    if (file) {
      await actions.openPdf(file);
    }
  };
  // Image needs a file first, so it stays a toolbar action rather than a key.
  const toolKeys: Shortcut[] = TOOLS.filter((tool) => tool.id !== "image").map((tool) => ({
    matches: plainKey(tool.shortcut.toLowerCase(), tool.shortcut),
    run: () => store.selectTool(tool.id),
  }));

  return [
    { matches: (event) => withCommand("z")(event) && event.shiftKey, run: () => store.redo() },
    { matches: withCommand("z"), run: () => store.undo() },
    { matches: withCommand("y"), run: () => store.redo() },
    { matches: withCommand("s"), run: () => void actions.save() },
    { matches: withCommand("o"), run: () => void openPdf() },
    { matches: plainKey("Delete", "Backspace"), run: () => actions.deleteSelectedAnnotation() },
    { matches: plainKey("Escape"), run: () => actions.cancelCurrentAction() },
    { matches: plainKey("+", "="), run: () => actions.zoomIn() },
    { matches: plainKey("-", "_"), run: () => actions.zoomOut() },
    ...toolKeys,
  ];
}

function shouldIgnoreShortcuts(target: EventTarget | null): boolean {
  if (document.querySelector("dialog[open]")) {
    return true; // a modal owns the keyboard
  }
  return (
    target instanceof HTMLElement &&
    (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
  );
}

/** Global keyboard shortcuts. Ignored while typing, and (except Open) until a PDF is open. */
export function useKeyboardShortcuts(store: EditorStore, actions: EditorActions): void {
  useEffect(() => {
    const shortcuts = buildShortcuts(store, actions);
    const openShortcut = withCommand("o");

    const handleKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnoreShortcuts(event.target)) {
        return;
      }
      const isDocumentOpen = hasDocument(store.getSnapshot().document);
      const shortcut = shortcuts.find((candidate) => candidate.matches(event));
      if (!shortcut || (!isDocumentOpen && !openShortcut(event))) {
        return;
      }
      event.preventDefault();
      shortcut.run();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [store, actions]);
}
