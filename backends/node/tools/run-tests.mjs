import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendFolder = dirname(dirname(fileURLToPath(import.meta.url)));

const workspaces = [
  join(backendFolder, "shared"),
  join(backendFolder, "subgraphs", "catalogue"),
  join(backendFolder, "subgraphs", "cart"),
  join(backendFolder, "subgraphs", "promotions"),
  join(backendFolder, "subgraphs", "ordering"),
  join(backendFolder, "subgraphs", "accounts"),
  join(backendFolder, "router")
];

function testFilesUnder(folder) {
  if (!existsSync(folder)) {
    return [];
  }
  const found = [];
  for (const entry of readdirSync(folder)) {
    const candidate = join(folder, entry);
    if (statSync(candidate).isDirectory()) {
      found.push(...testFilesUnder(candidate));
      continue;
    }
    if (entry.endsWith(".test.js")) {
      found.push(candidate);
    }
  }
  return found;
}

const files = workspaces.flatMap((workspace) => testFilesUnder(join(workspace, "distribution", "tests")));

if (files.length === 0) {
  console.error("no compiled tests were found, run the build first");
  process.exit(1);
}

const outcome = spawnSync(process.execPath, ["--test", "--test-reporter=spec", ...files], {
  stdio: "inherit",
  cwd: backendFolder
});

process.exit(outcome.status ?? 1);
