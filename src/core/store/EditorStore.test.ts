import { describe, expect, it } from "vitest";
import {
  AddAnnotationCommand,
  MoveAnnotationCommand,
  RemoveAnnotationCommand,
} from "../commands/annotationCommands";
import {
  DeletePageCommand,
  InsertPagesCommand,
  MovePageCommand,
  RotatePageCommand,
} from "../commands/pageCommands";
import type { DocumentState, PageEntry } from "../document/DocumentState";
import type { Rotation } from "../geometry";
import type { PageSource } from "../pages/PageSource";
import type { HighlightAnnotation, TextAnnotation } from "../annotations/types";
import { EditorStore } from "./EditorStore";

function fakeSource(key: string, intrinsicRotation: Rotation = 0): PageSource {
  return {
    key,
    size: { width: 600, height: 800 },
    intrinsicRotation,
    originLabel: "test.pdf",
    openedWithPassword: null,
    renderTo: async () => undefined,
    appendTo: async () => {
      throw new Error("not used in tests");
    },
  };
}

function page(id: string): PageEntry {
  return { id, source: fakeSource(id), userRotation: 0 };
}

function documentWith(...pageIds: string[]): DocumentState {
  return { fileName: "test.pdf", pages: pageIds.map(page), annotations: [] };
}

const highlight: HighlightAnnotation = {
  id: "h1",
  pageId: "p1",
  type: "highlight",
  rect: { x: 100, y: 50, width: 200, height: 40 },
  color: "#ffd43b",
};

function pageIds(store: EditorStore): string[] {
  return store.getSnapshot().document.pages.map((entry) => entry.id);
}

describe("EditorStore", () => {
  it("undoes and redoes commands", () => {
    const store = new EditorStore();
    store.openDocument(documentWith("p1"));
    store.execute(new AddAnnotationCommand(highlight));
    expect(store.getSnapshot().document.annotations).toHaveLength(1);

    store.undo();
    expect(store.getSnapshot().document.annotations).toHaveLength(0);
    expect(store.getSnapshot().canRedo).toBe(true);

    store.redo();
    expect(store.getSnapshot().document.annotations).toHaveLength(1);
  });

  it("records a previewed gesture as a single history step", () => {
    const store = new EditorStore();
    store.openDocument(documentWith("p1"));
    store.execute(new AddAnnotationCommand(highlight));

    store.preview(new MoveAnnotationCommand("h1", 5, 5));
    store.preview(new MoveAnnotationCommand("h1", 30, 10));
    store.commitPreview();

    const moved = store.getSnapshot().document.annotations[0] as HighlightAnnotation;
    expect(moved.rect).toMatchObject({ x: 130, y: 60 });

    store.undo();
    const restored = store.getSnapshot().document.annotations[0] as HighlightAnnotation;
    expect(restored.rect).toMatchObject({ x: 100, y: 50 });
  });

  it("drops the selection when the selected annotation disappears", () => {
    const store = new EditorStore();
    store.openDocument(documentWith("p1"));
    store.execute(new AddAnnotationCommand(highlight));
    store.selectAnnotation("h1");
    store.execute(new RemoveAnnotationCommand("h1"));
    expect(store.getSnapshot().ui.selectedAnnotationId).toBeNull();
  });

  it("tracks unsaved changes against the last save", () => {
    const store = new EditorStore();
    store.openDocument(documentWith("p1"));
    expect(store.getSnapshot().hasUnsavedChanges).toBe(false);
    store.execute(new AddAnnotationCommand(highlight));
    expect(store.getSnapshot().hasUnsavedChanges).toBe(true);
    store.markSaved();
    expect(store.getSnapshot().hasUnsavedChanges).toBe(false);
  });
});

describe("page commands", () => {
  it("reorders pages", () => {
    const store = new EditorStore();
    store.openDocument(documentWith("p1", "p2", "p3"));
    store.execute(new MovePageCommand("p1", 2));
    expect(pageIds(store)).toEqual(["p2", "p3", "p1"]);
    store.execute(new MovePageCommand("p1", 0));
    expect(pageIds(store)).toEqual(["p1", "p2", "p3"]);
  });

  it("inserts pages at a position and deletes them with their annotations", () => {
    const store = new EditorStore();
    store.openDocument(documentWith("p1", "p2"));
    store.execute(new InsertPagesCommand([page("new")], 1));
    expect(pageIds(store)).toEqual(["p1", "new", "p2"]);

    store.execute(new AddAnnotationCommand(highlight));
    store.execute(new DeletePageCommand("p1"));
    expect(pageIds(store)).toEqual(["new", "p2"]);
    expect(store.getSnapshot().document.annotations).toHaveLength(0);
  });

  it("turns annotations with their page and returns them after four turns", () => {
    const store = new EditorStore();
    store.openDocument(documentWith("p1"));
    store.execute(new AddAnnotationCommand(highlight));

    store.execute(new RotatePageCommand("p1", 1));
    const turned = store.getSnapshot().document;
    expect(turned.pages[0]?.userRotation).toBe(90);
    // On a 600×800 page, a box at (100,50) 200×40 lands at (800-90, 100) 40×200.
    expect((turned.annotations[0] as HighlightAnnotation).rect).toEqual({
      x: 710,
      y: 100,
      width: 40,
      height: 200,
    });

    store.execute(new RotatePageCommand("p1", 3));
    const back = store.getSnapshot().document;
    expect(back.pages[0]?.userRotation).toBe(0);
    expect((back.annotations[0] as HighlightAnnotation).rect).toEqual(highlight.rect);
  });

  it("keeps text upright and on the page when its page turns", () => {
    const store = new EditorStore();
    store.openDocument(documentWith("p1"));
    const text: TextAnnotation = {
      id: "t1",
      pageId: "p1",
      type: "text",
      position: { x: 50, y: 100 },
      text: "Hello",
      fontSize: 10,
      color: "#000000",
    };
    store.execute(new AddAnnotationCommand(text));
    store.execute(new RotatePageCommand("p1", 1));
    const turned = store.getSnapshot().document.annotations[0] as TextAnnotation;
    // Corner (50,100) turns to (700, 50); the one-line block (12pt tall) sits left of it.
    expect(turned.position).toEqual({ x: 688, y: 50 });
  });
});
