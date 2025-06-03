import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: "/", // ensures correct asset paths when served via Nginx
  server: {
    host: true,
    port: 5173,
  },
  build: {
    outDir: "dist", // default but explicit
    emptyOutDir: true,
  },
});
