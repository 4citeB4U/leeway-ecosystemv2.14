import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8765",
        changeOrigin: true,
      },
      "/speak": {
        target: "http://127.0.0.1:8765",
        changeOrigin: true,
      },
      "/fabric": {
        target: "http://127.0.0.1:4001",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/fabric/, ""),
      },
      "/brain": {
        target: "http://127.0.0.1:8080",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/brain/, ""),
      },
      "/desktop": {
        target: "http://127.0.0.1:8091",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/desktop/, ""),
      },
      "/ollama": {
        target: "http://127.0.0.1:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/ollama/, ""),
      },
    },
  },
  build: {
    target: "esnext",
    minify: "terser", // High-quality minification
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000, // Increased threshold for high-quality components
    rollupOptions: {
      output: {
        // Simplified chunking to avoid circular chunk dependency issues
        manualChunks(id) {
          if (id.includes("node_modules")) {
            return "vendor";
          }
        },
        // Ensure consistent naming for 'Instant Repair' tracking
        entryFileNames: `assets/[name].[hash].js`,
        chunkFileNames: `assets/[name].[hash].js`,
        assetFileNames: `assets/[name].[hash].[ext]`,
      },
    },
  },
});
