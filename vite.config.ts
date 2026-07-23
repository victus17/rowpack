import preact from "@preact/preset-vite";
import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

export default defineConfig({
  base: "./",
  plugins: [preact(), viteSingleFile()],
  build: {
    assetsInlineLimit: Number.POSITIVE_INFINITY,
    cssCodeSplit: false,
    emptyOutDir: true,
    outDir: "dist/runtime",
    sourcemap: false,
    target: "es2022",
  },
});
