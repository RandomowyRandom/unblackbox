import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// base "./" keeps asset paths relative, so the build runs from any playground folder and inside Tauri.
export default defineConfig({
  root: import.meta.dirname,
  base: "./",
  plugins: [react()],
  build: { outDir: "dist", emptyOutDir: true },
  clearScreen: false,
});
