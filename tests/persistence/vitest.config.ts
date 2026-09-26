import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  oxc: { jsx: { runtime: "automatic" } },
  test: {
    environment: "jsdom",
    include: ["tests/persistence/**/*.test.{ts,tsx}"],
  },
  resolve: {
    alias: [
      { find: "server-only", replacement: path.resolve(process.cwd(), "tests/persistence/server-only.stub.ts") },
      { find: "@", replacement: path.resolve(process.cwd(), "src") },
    ],
  },
});
