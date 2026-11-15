import type { HexColor, ImageMimeType } from "../annotations/types";
import type { Point } from "../geometry";

export type ToolId = "select" | "text" | "draw" | "highlight" | "whiteout" | "image";

export interface ToolSettings {
  readonly textColor: HexColor;
  readonly fontSize: number;
  readonly inkColor: HexColor;
  readonly strokeWidth: number;
  readonly highlightColor: HexColor;
  readonly whiteoutColor: HexColor;
}

/** An image the user picked and is about to place on a page. */
export interface PendingImage {
  readonly dataUrl: string;
  readonly mimeType: ImageMimeType;
  readonly width: number;
  readonly height: number;
}

/**
 * Text that is open for typing. The draft lives here, not in the document, so the
 * properties panel can restyle it mid-edit and it lands in history as one step.
 */
export interface TextEditSession {
  /** The text annotation being changed, or null when typing new text. */
  readonly annotationId: string | null;
  readonly pageId: string;
  readonly position: Point;
  readonly text: string;
  readonly fontSize: number;
  readonly color: HexColor;
}

export type TextDraftChanges = Partial<Pick<TextEditSession, "text" | "fontSize" | "color">>;

/** Font sizes offered in the size dropdown, in points. */
export const FONT_SIZES: readonly number[] = [
  6, 7, 8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 40, 48, 60, 72,
];

/** Editor state that is not part of the document and is never undone. */
export interface UiState {
  readonly activeTool: ToolId;
  readonly settings: ToolSettings;
  readonly selectedAnnotationId: string | null;
  readonly activePageId: string | null;
  readonly textEdit: TextEditSession | null;
  readonly pendingImage: PendingImage | null;
  readonly zoom: number;
  readonly notice: string | null;
}

export const ZOOM_LIMITS = { min: 0.25, max: 4, step: 1.2 } as const;

export const INITIAL_UI_STATE: UiState = {
  activeTool: "select",
  settings: {
    textColor: "#1b1f24",
    fontSize: 14,
    inkColor: "#1f4fd1",
    strokeWidth: 2,
    highlightColor: "#ffd43b",
    whiteoutColor: "#ffffff",
  },
  selectedAnnotationId: null,
  activePageId: null,
  textEdit: null,
  pendingImage: null,
  zoom: 1.25,
  notice: null,
};
