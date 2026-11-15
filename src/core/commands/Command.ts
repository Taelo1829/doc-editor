import type { DocumentState } from "../document/DocumentState";

/**
 * A single, undoable edit. Commands are pure: they receive the current state
 * and return the next one without touching anything else.
 */
export interface DocumentCommand {
  /** Short description, shown next to undo and redo. */
  readonly label: string;
  apply(state: DocumentState): DocumentState;
}
