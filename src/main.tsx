import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./ui/App";
import { EditorProvider } from "./ui/EditorContext";
import "./ui/styles.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

createRoot(root).render(
  <StrictMode>
    <EditorProvider>
      <App />
    </EditorProvider>
  </StrictMode>,
);
