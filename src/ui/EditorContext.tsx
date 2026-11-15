import { createContext, useContext, useState, useSyncExternalStore, type ReactNode } from "react";
import { EditorStore, type EditorSnapshot } from "../core/store/EditorStore";
import { EditorActions } from "../editor/EditorActions";
import { DialogController } from "../editor/dialogs/DialogController";

interface EditorServices {
  readonly store: EditorStore;
  readonly actions: EditorActions;
  readonly dialogs: DialogController;
}

const EditorContext = createContext<EditorServices | null>(null);

export function EditorProvider({ children }: { children: ReactNode }) {
  const [services] = useState<EditorServices>(() => {
    const store = new EditorStore();
    const dialogs = new DialogController();
    return { store, dialogs, actions: new EditorActions(store, dialogs) };
  });
  return <EditorContext.Provider value={services}>{children}</EditorContext.Provider>;
}

export function useEditorServices(): EditorServices {
  const services = useContext(EditorContext);
  if (!services) {
    throw new Error("useEditorServices must be used inside <EditorProvider>");
  }
  return services;
}

/** Re-renders the calling component whenever the editor state changes. */
export function useEditorState(): EditorSnapshot {
  const { store } = useEditorServices();
  return useSyncExternalStore(store.subscribe, store.getSnapshot);
}
