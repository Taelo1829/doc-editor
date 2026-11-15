import { describe, expect, it } from "vitest";
import type { TextAnnotation } from "../../core/annotations/types";
import type { DocumentState } from "../../core/document/DocumentState";
import { INITIAL_UI_STATE } from "../../core/store/uiState";
import { existingTextSession, newTextSession, planTextEditOutcome } from "./textEditing";

const existing: TextAnnotation = {
  id: "t1",
  pageId: "p1",
  type: "text",
  position: { x: 10, y: 20 },
  text: "Hello",
  fontSize: 12,
  color: "#000000",
};

const document: DocumentState = { fileName: "a.pdf", pages: [], annotations: [existing] };

function apply(outcome: ReturnType<typeof planTextEditOutcome>, state: DocumentState = document) {
  return outcome.command ? outcome.command.apply(state) : state;
}

describe("planTextEditOutcome", () => {
  it("adds new text with the size chosen while typing, and selects it", () => {
    const session = { ...newTextSession("p1", { x: 5, y: 5 }, INITIAL_UI_STATE.settings), text: "New", fontSize: 24 };
    const outcome = planTextEditOutcome(session, document);
    const added = apply(outcome).annotations.at(-1) as TextAnnotation;
    expect(added).toMatchObject({ text: "New", fontSize: 24, position: { x: 5, y: 5 } });
    expect(outcome.selectId).toBe(added.id);
  });

  it("ignores new text that was left empty", () => {
    const session = { ...newTextSession("p1", { x: 5, y: 5 }, INITIAL_UI_STATE.settings), text: "  " };
    expect(planTextEditOutcome(session, document)).toEqual({ command: null, selectId: null });
  });

  it("saves text and size changes to existing text as one edit", () => {
    const session = { ...existingTextSession(existing), text: "Hello there", fontSize: 18 };
    const outcome = planTextEditOutcome(session, document);
    expect(apply(outcome).annotations[0]).toMatchObject({ text: "Hello there", fontSize: 18 });
    expect(outcome.selectId).toBe("t1");
  });

  it("records nothing when existing text is unchanged, but keeps it selected", () => {
    const outcome = planTextEditOutcome(existingTextSession(existing), document);
    expect(outcome).toEqual({ command: null, selectId: "t1" });
  });

  it("removes existing text that was emptied", () => {
    const session = { ...existingTextSession(existing), text: "" };
    expect(apply(planTextEditOutcome(session, document)).annotations).toHaveLength(0);
  });
});
