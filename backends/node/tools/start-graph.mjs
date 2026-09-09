import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendFolder = dirname(dirname(fileURLToPath(import.meta.url)));

const processes = [
  { name: "catalogue", folder: join(backendFolder, "subgraphs", "catalogue") },
  { name: "cart", folder: join(backendFolder, "subgraphs", "cart") },
  { name: "promotions", folder: join(backendFolder, "subgraphs", "promotions") },
  { name: "ordering", folder: join(backendFolder, "subgraphs", "ordering") },
  { name: "accounts", folder: join(backendFolder, "subgraphs", "accounts") },
  { name: "gateway", folder: join(backendFolder, "router") }
];

const started = [];

function launch(entry) {
  const child = spawn(process.execPath, [join(entry.folder, "distribution", "src", "host", "main.js")], {
    cwd: entry.folder,
    env: process.env,
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${entry.name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${entry.name}] ${chunk}`));
  child.on("exit", (code) => console.log(`[${entry.name}] stopped with code ${code}`));
  started.push(child);
}

async function waitForHealth(port) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://localhost:${port}/health`, { signal: AbortSignal.timeout(1000) });
      if (response.ok) {
        return true;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  return false;
}

for (const entry of processes.slice(0, 5)) {
  launch(entry);
}

const subgraphPorts = [4101, 4102, 4103, 4104, 4105];
for (const port of subgraphPorts) {
  if (!(await waitForHealth(port))) {
    console.error(`the subgraph on port ${port} did not answer /health`);
    for (const child of started) {
      child.kill();
    }
    process.exit(1);
  }
}

launch(processes[5]);
if (!(await waitForHealth(4100))) {
  console.error("the gateway did not answer /health");
  for (const child of started) {
    child.kill();
  }
  process.exit(1);
}

console.log("the graph is ready on http://localhost:4100/graphql");

function stopEverything() {
  for (const child of started) {
    child.kill();
  }
}

process.on("SIGINT", () => {
  stopEverything();
  process.exit(0);
});
process.on("SIGTERM", () => {
  stopEverything();
  process.exit(0);
});
