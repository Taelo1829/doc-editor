import { useEffect, useRef, type FocusEvent, type KeyboardEvent } from "react";
import { TEXT_LAYOUT, splitTextLines } from "../../core/annotations/types";
import type { TextEditSession } from "../../core/store/uiState";
import { useEditorServices } from "../EditorContext";
import { ANNOTATION_FONT_FAMILY } from "../text/measureText";

/** Controls marked with this attribute can restyle the text without closing the text box. */
export const TEXT_STYLE_CONTROLS_ATTRIBUTE = "data-text-style-controls";

/**
 * A textarea laid exactly over where the text will appear on the page.
 * The draft lives in the store, so the properties panel can change its size or
 * colour while typing. Leaving the box saves; Escape discards; Ctrl/Cmd+Enter saves.
 */
export function TextEditorOverlay({ session, zoom }: { session: TextEditSession; zoom: number }) {
  const { store, actions } = useEditorServices();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Take focus on open, and take it back after the panel restyles the text.
  useEffect(() => {
    const textarea = textareaRef.current;
    textarea?.focus();
    textarea?.setSelectionRange(textarea.value.length, textarea.value.length);
  }, [session.fontSize, session.color]);

  const handleBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    const movingTo = event.relatedTarget instanceof Element ? event.relatedTarget : null;
    if (movingTo?.closest(`[${TEXT_STYLE_CONTROLS_ATTRIBUTE}]`)) {
      return; // restyling from the panel; keep editing
    }
    actions.finishTextEdit();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    event.stopPropagation();
    if (event.key === "Escape") {
      actions.discardTextEdit();
    }
    if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
      actions.finishTextEdit();
    }
  };

  const lines = splitTextLines(session.text);
  return (
    <textarea
      ref={textareaRef}
      className="text-editor"
      value={session.text}
      placeholder="Type here"
      spellCheck
      rows={lines.length}
      onChange={(event) => store.updateTextDraft({ text: event.target.value })}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      onPointerDown={(event) => event.stopPropagation()}
      style={{
        left: session.position.x * zoom,
        top: session.position.y * zoom,
        fontSize: session.fontSize * zoom,
        lineHeight: TEXT_LAYOUT.lineHeight,
        fontFamily: ANNOTATION_FONT_FAMILY,
        color: session.color,
        minWidth: Math.max(...lines.map((line) => line.length), 8) * session.fontSize * zoom * 0.62,
      }}
    />
  );
}
