import type { ReactNode } from "react";
import type {
  Annotation,
  AnnotationOfType,
  AnnotationType,
} from "../../core/annotations/types";
import { UpdateAnnotationCommand } from "../../core/commands/annotationCommands";
import { findAnnotation } from "../../core/document/DocumentState";
import type { TextEditSession, ToolId, ToolSettings } from "../../core/store/uiState";
import { getTool } from "../../editor/tools/toolRegistry";
import { Icon } from "../components/Icon";
import { useEditorServices, useEditorState } from "../EditorContext";
import { TEXT_STYLE_CONTROLS_ATTRIBUTE } from "../pages/TextEditorOverlay";
import { ColorField, FontSizeField, SliderField } from "./fields";

const INK_SWATCHES = ["#1b1f24", "#1f4fd1", "#c92a2a", "#2b8a3e", "#6741d9"];
const HIGHLIGHT_SWATCHES = ["#ffd43b", "#8ce99a", "#74c0fc", "#fcc2d7", "#ffc078"];
const COVER_SWATCHES = ["#ffffff", "#f8f4ec", "#1b1f24"];

const STROKE_WIDTH = { min: 0.5, max: 12, step: 0.5, unit: "pt" } as const;

// ── Settings for the next thing a tool creates ─────────────────────────────────

interface SettingsSectionProps {
  readonly settings: ToolSettings;
  update(changes: Partial<ToolSettings>): void;
}

const toolSettingsSections: Record<ToolId, (props: SettingsSectionProps) => ReactNode> = {
  select: () => null,
  image: () => null,
  text: ({ settings }) => <TextStyleFields fontSize={settings.fontSize} color={settings.textColor} />,
  draw: ({ settings, update }) => (
    <>
      <ColorField label="Colour" value={settings.inkColor} swatches={INK_SWATCHES} onChange={(inkColor) => update({ inkColor })} />
      <SliderField label="Thickness" value={settings.strokeWidth} {...STROKE_WIDTH} onPreview={(strokeWidth) => update({ strokeWidth })} onCommit={(strokeWidth) => update({ strokeWidth })} />
    </>
  ),
  highlight: ({ settings, update }) => (
    <ColorField label="Colour" value={settings.highlightColor} swatches={HIGHLIGHT_SWATCHES} onChange={(highlightColor) => update({ highlightColor })} />
  ),
  whiteout: ({ settings, update }) => (
    <ColorField label="Fill" value={settings.whiteoutColor} swatches={COVER_SWATCHES} onChange={(whiteoutColor) => update({ whiteoutColor })} />
  ),
};

// ── Editing the selected annotation ────────────────────────────────────────────

interface AnnotationSectionProps<A extends Annotation> {
  readonly annotation: A;
  preview(changes: Partial<A>): void;
  commit(changes: Partial<A>): void;
}

type AnnotationSections = {
  [T in AnnotationType]: (props: AnnotationSectionProps<AnnotationOfType<T>>) => ReactNode;
};

const annotationSections: AnnotationSections = {
  text: ({ annotation }) => (
    <>
      <TextStyleFields fontSize={annotation.fontSize} color={annotation.color} />
      <p className="panel-note">Double-click the text on the page to change what it says.</p>
    </>
  ),
  ink: ({ annotation, preview, commit }) => (
    <>
      <ColorField label="Colour" value={annotation.color} swatches={INK_SWATCHES} onChange={(color) => commit({ color })} />
      <SliderField label="Thickness" value={annotation.strokeWidth} {...STROKE_WIDTH} onPreview={(strokeWidth) => preview({ strokeWidth })} onCommit={(strokeWidth) => commit({ strokeWidth })} />
    </>
  ),
  highlight: ({ annotation, commit }) => (
    <ColorField label="Colour" value={annotation.color} swatches={HIGHLIGHT_SWATCHES} onChange={(color) => commit({ color })} />
  ),
  whiteout: ({ annotation, commit }) => (
    <ColorField label="Fill" value={annotation.color} swatches={COVER_SWATCHES} onChange={(color) => commit({ color })} />
  ),
  image: () => <p className="panel-note">Drag the corner handle to resize.</p>,
};

const ANNOTATION_TITLES: Record<AnnotationType, string> = {
  text: "Text",
  ink: "Drawing",
  highlight: "Highlight",
  whiteout: "White-out",
  image: "Image",
};

/**
 * Shows, in order of priority: the text being typed, the selected annotation,
 * or the settings the active tool will use next.
 */
export function PropertiesPanel() {
  const { document, ui } = useEditorState();
  const selected = ui.selectedAnnotationId ? findAnnotation(document, ui.selectedAnnotationId) : null;
  const panelProps = { [TEXT_STYLE_CONTROLS_ATTRIBUTE]: true };

  return (
    <aside className="properties" aria-label="Properties" {...panelProps}>
      {ui.textEdit ? (
        <TextEditProperties session={ui.textEdit} />
      ) : selected ? (
        <SelectedAnnotationProperties annotation={selected} />
      ) : (
        <ToolProperties toolId={ui.activeTool} />
      )}
      <ShortcutList />
    </aside>
  );
}

/** Colour and size for text. Applies to whatever text is current: being typed, selected, or next. */
function TextStyleFields({ fontSize, color }: { fontSize: number; color: string }) {
  const { actions } = useEditorServices();
  return (
    <>
      <ColorField label="Colour" value={color} swatches={INK_SWATCHES} onChange={(next) => actions.setTextColor(next)} />
      <FontSizeField value={fontSize} onChange={(next) => actions.setFontSize(next)} />
    </>
  );
}

function TextEditProperties({ session }: { session: TextEditSession }) {
  return (
    <section className="panel-section">
      <header className="panel-heading">
        <span>Text</span>
        <span className="muted">typing</span>
      </header>
      <TextStyleFields fontSize={session.fontSize} color={session.color} />
      <p className="panel-note">Click outside the text box to finish. Esc discards changes.</p>
    </section>
  );
}

function ToolProperties({ toolId }: { toolId: ToolId }) {
  const { store } = useEditorServices();
  const { ui } = useEditorState();
  const tool = getTool(toolId);
  const Section = toolSettingsSections[toolId];
  return (
    <section className="panel-section">
      <header className="panel-heading">
        <span>{tool.label}</span>
        <kbd>{tool.shortcut}</kbd>
      </header>
      <p className="panel-note">{tool.hint}</p>
      <Section settings={ui.settings} update={(changes) => store.updateSettings(changes)} />
    </section>
  );
}

function SelectedAnnotationProperties({ annotation }: { annotation: Annotation }) {
  const { store, actions } = useEditorServices();
  const Section = annotationSections[annotation.type] as (props: AnnotationSectionProps<Annotation>) => ReactNode;
  return (
    <section className="panel-section">
      <header className="panel-heading">
        <span>{ANNOTATION_TITLES[annotation.type]}</span>
        <span className="muted">selected</span>
      </header>
      <Section
        annotation={annotation}
        preview={(changes) => store.preview(new UpdateAnnotationCommand(annotation.id, changes))}
        commit={(changes) => store.execute(new UpdateAnnotationCommand(annotation.id, changes))}
      />
      <button type="button" className="button button-danger" onClick={() => actions.deleteSelectedAnnotation()}>
        <Icon name="trash" size={16} /> Delete
      </button>
    </section>
  );
}

const SHORTCUTS: readonly [string, string][] = [
  ["Ctrl Z / Ctrl Y", "Undo / redo"],
  ["Del", "Delete selection"],
  ["Esc", "Cancel, back to Select"],
  ["+ / −", "Zoom"],
  ["Ctrl S", "Save PDF"],
];

function ShortcutList() {
  return (
    <section className="panel-section shortcuts">
      <header className="panel-heading">
        <span>Shortcuts</span>
      </header>
      <dl>
        {SHORTCUTS.map(([keys, action]) => (
          <div key={keys} className="shortcut-row">
            <dt>
              <kbd>{keys}</kbd>
            </dt>
            <dd>{action}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
