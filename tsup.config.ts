import { defineConfig } from "tsup";

export default defineConfig({
  banner: {
    js: "#!/usr/bin/env node",
  },
  clean: true,
  dts: true,
  entry: {
    index: "src/cli/index.ts",
  },
  format: ["esm"],
  minify: false,
  outDir: "dist/cli",
  platform: "node",
  shims: false,
  sourcemap: true,
  splitting: false,
  target: "node22",
});
