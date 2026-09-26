import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "jsdom",
    include: ["tests/editor-customize/**/*.test.tsx"],
  },
  resolve: { alias: { "@": `${process.cwd()}/src` } },
});
