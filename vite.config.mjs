import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    port: 8666,
    strictPort: true,
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/admin/main.jsx"],
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 8666,
    strictPort: true,
  },
  plugins: [react()],
});
