import { spawnSync } from "node:child_process";
import { resolve } from "node:path";

const configs = [
  "vitest.config.ts",
  "tests/dashboard/vitest.config.ts",
  "tests/editor-content/vitest.config.ts",
  "tests/editor-customize/vitest.config.ts",
  "tests/resume-renderer/vitest.config.ts",
  "tests/import/vitest.config.ts",
  "tests/persistence/vitest.config.ts",
];

for (const config of configs) {
  const result = spawnSync(process.execPath, [resolve("node_modules/vitest/vitest.mjs"), "run", "--config", config, "--configLoader", "runner"], {
    cwd: process.cwd(),
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
