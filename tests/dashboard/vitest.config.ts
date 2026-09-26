import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "jsdom",
    include: ["tests/dashboard/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: [
      {
        find: "@/features/resume-renderer/ResumeRenderer",
        replacement: resolve(process.cwd(), "tests/dashboard/ResumeRenderer.stub.tsx"),
      },
      { find: "@", replacement: resolve(process.cwd(), "src") },
    ],
  },
});
