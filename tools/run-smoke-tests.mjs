#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const testsRoot = join(repoRoot, "tests");

function collectTestFiles(dir) {
  if (!existsSync(dir)) {
    return [];
  }

  const entries = readdirSync(dir, { withFileTypes: true })
    .filter((entry) => !entry.name.startsWith("."))
    .sort((a, b) => a.name.localeCompare(b.name));

  const files = [];
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectTestFiles(path));
    } else if (entry.isFile() && entry.name.endsWith(".test.mjs")) {
      files.push(path);
    }
  }

  return files;
}

const testFiles = collectTestFiles(testsRoot);

if (testFiles.length === 0) {
  console.error("No smoke tests found under tests/**/*.test.mjs");
  process.exit(1);
}

const displayList = testFiles.map((file) => `  - ${relative(repoRoot, file)}`).join("\n");
console.log(`Running Pixi UI Editor smoke tests:\n${displayList}\n`);

const nodeArgs = ["--test", ...testFiles];
const result = spawnSync(process.execPath, nodeArgs, {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error) {
  console.error(result.error.message);
  process.exit(1);
}

process.exit(result.status ?? 1);
