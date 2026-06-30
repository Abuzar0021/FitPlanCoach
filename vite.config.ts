import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    tailwindcss(),
  ],

  server: {
    host: true,
    port: 5173,
  },

  build: {
    outDir: "dist",
  },

  // keeps compatibility with TanStack Start structure
  resolve: {
    alias: {
      "@": "/src",
    },
  },
});