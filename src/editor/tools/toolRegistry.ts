import type { ToolId } from "../../core/store/uiState";
import { DrawTool } from "./DrawTool";
import { ImageTool } from "./ImageTool";
import { HighlightTool, WhiteoutTool } from "./RectangleTool";
import { SelectTool } from "./SelectTool";
import { TextTool } from "./TextTool";
import type { Tool } from "./Tool";

/** Toolbar order. */
export const TOOLS: readonly Tool[] = [
  new SelectTool(),
  new TextTool(),
  new DrawTool(),
  new HighlightTool(),
  new WhiteoutTool(),
  new ImageTool(),
];

const toolsById = new Map<ToolId, Tool>(TOOLS.map((tool) => [tool.id, tool]));

export function getTool(id: ToolId): Tool {
  const tool = toolsById.get(id);
  if (!tool) {
    throw new Error(`Unknown tool: ${id}`);
  }
  return tool;
}
