import { spawn } from "node:child_process";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const backendFolder = dirname(dirname(fileURLToPath(import.meta.url)));
const repositoryRoot = dirname(dirname(backendFolder));
const runner = join(repositoryRoot, "tools", "conformance", "run.mjs");

if (!existsSync(runner)) {
  console.log("the conformance runner does not exist yet at " + runner);
  process.exit(0);
}

const folder = mkdtempSync(join(tmpdir(), "zappy-conformance-"));
for (const name of ["CATALOGUE", "CART", "PROMOTIONS", "ORDERING", "ACCOUNTS"]) {
  process.env[`ZAPPY_${name}_SQLITE_FILE`] = join(folder, `${name.toLowerCase()}.sqlite`);
}
process.env.ZAPPY_PROFILE = "development";

const { startAccounts } = await import("../subgraphs/accounts/distribution/src/host/main.js");
const { startCatalogue } = await import("../subgraphs/catalogue/distribution/src/host/main.js");
const { startCart } = await import("../subgraphs/cart/distribution/src/host/main.js");
const { startPromotions } = await import("../subgraphs/promotions/distribution/src/host/main.js");
const { startOrdering } = await import("../subgraphs/ordering/distribution/src/host/main.js");
const { startGateway } = await import("../router/distribution/src/host/main.js");

const running = [
  await startAccounts(),
  await startCatalogue(),
  await startCart(),
  await startPromotions(),
  await startOrdering(),
  await startGateway()
];

const exitCode = await new Promise((resolve) => {
  const child = spawn(
    process.execPath,
    [runner, "--url", "http://localhost:4100/graphql", ...process.argv.slice(2)],
    { stdio: "inherit", cwd: repositoryRoot }
  );
  child.on("exit", (code) => resolve(code ?? 1));
});

for (const part of running.reverse()) {
  await part.stop();
}
rmSync(folder, { recursive: true, force: true });
process.exit(exitCode);
