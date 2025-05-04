import { defineConfig } from "vite";

export default defineConfig({
  root: ".",
  server: {
    open: true, // Automatically open the browser
  },
  build: {
    outDir: "dist", // Output directory for the build
  },
});
