import type { TextAnnotation } from "../../core/annotations/types";
import {
  AddAnnotationCommand,
  RemoveAnnotationCommand,
  UpdateAnnotationCommand,
} from "../../core/commands/annotationCommands";
import type { DocumentCommand } from "../../core/commands/Command";
import type { DocumentState } from "../../core/document/DocumentState";
import type { Point } from "../../core/geometry";
import { createId } from "../../core/ids";
import type { TextEditSession, ToolSettings } from "../../core/store/uiState";

export function newTextSession(pageId: string, position: Point, settings: ToolSettings): TextEditSession {
  return {
    annotationId: null,
    pageId,
    position,
    text: "",
    fontSize: settings.fontSize,
    color: settings.textColor,
  };
}

export function existingTextSession(annotation: TextAnnotation): TextEditSession {
  const { id, pageId, position, text, fontSize, color } = annotation;
  return { annotationId: id, pageId, position, text, fontSize, color };
}

/** What finishing a text edit does to the document, and which annotation to select after. */
export interface TextEditOutcome {
  readonly command: DocumentCommand | null;
  readonly selectId: string | null;
}

const NOTHING: TextEditOutcome = { command: null, selectId: null };

/**
 * Works out how to save a finished text edit: new text is added, emptied text is
 * removed, and changed text is updated in one step (so one undo reverts it).
 */
export function planTextEditOutcome(session: TextEditSession, document: DocumentState): TextEditOutcome {
  const isEmpty = session.text.trim() === "";
  if (session.annotationId === null) {
    return isEmpty ? NOTHING : addNewText(session);
  }
  const original = document.annotations.find((annotation) => annotation.id === session.annotationId);
  if (!original) {
    return NOTHING; // removed meanwhile, e.g. by undo
  }
  if (isEmpty) {
    return { command: new RemoveAnnotationCommand(original.id), selectId: null };
  }
  return { command: updateText(original as TextAnnotation, session), selectId: original.id };
}

function addNewText(session: TextEditSession): TextEditOutcome {
  const annotation: TextAnnotation = {
    id: createId("text"),
    pageId: session.pageId,
    type: "text",
    position: session.position,
    text: session.text,
    fontSize: session.fontSize,
    color: session.color,
  };
  return { command: new AddAnnotationCommand(annotation), selectId: annotation.id };
}

function updateText(original: TextAnnotation, session: TextEditSession): DocumentCommand | null {
  const unchanged =
    original.text === session.text &&
    original.fontSize === session.fontSize &&
    original.color === session.color;
  if (unchanged) {
    return null;
  }
  return new UpdateAnnotationCommand<TextAnnotation>(original.id, {
    text: session.text,
    fontSize: session.fontSize,
    color: session.color,
  });
}
