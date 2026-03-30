import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

export default defineConfig({
  plugins: [react()],
  base: "./",
  build: {
    outDir: "dist",
    rollupOptions: {
      external: [/^@\/.+/] // Externalize all @/ imports
    }
  },
  server: {
    middlewareMode: true // Better for SPA routing
  }
});