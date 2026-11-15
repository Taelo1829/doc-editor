import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: {
    // pdf.js is large by nature; the app is a single local tool, so one bundle is fine.
    chunkSizeWarningLimit: 1600,
  },
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
