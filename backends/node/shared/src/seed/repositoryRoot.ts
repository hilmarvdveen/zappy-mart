import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function findRepositoryRoot(startingFrom: string = fileURLToPath(import.meta.url)): string {
  let directory = dirname(startingFrom);
  while (true) {
    if (existsSync(join(directory, "contract", "schema.graphql"))) {
      return directory;
    }
    const parent = resolve(directory, "..");
    if (parent === directory) {
      throw new Error("No folder above this file holds contract/schema.graphql");
    }
    directory = parent;
  }
}

export function contractPath(...segments: readonly string[]): string {
  return join(findRepositoryRoot(), "contract", ...segments);
}

export function backendPath(...segments: readonly string[]): string {
  return join(findRepositoryRoot(), "backends", "node", ...segments);
}
