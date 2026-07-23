import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      include: ["src/shared/**/*.ts", "src/cli/**/*.ts"],
      provider: "v8",
      reporter: ["text", "html"],
    },
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
  },
});
