import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "jsdom",
    include: ["tests/resume-renderer/**/*.test.ts", "tests/resume-renderer/**/*.test.tsx"],
  },
  resolve: { alias: { "@": `${process.cwd()}/src` } },
});
