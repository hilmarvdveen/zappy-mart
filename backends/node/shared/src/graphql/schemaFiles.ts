import { readFileSync } from "node:fs";
import { join } from "node:path";
import { backendPath } from "../seed/repositoryRoot.js";
import type { Profile, SubgraphName } from "../configuration.js";

export function subgraphSchemaFolder(name: SubgraphName): string {
  return backendPath("subgraphs", name);
}

export function readSubgraphSchema(name: SubgraphName, profile: Profile): string {
  const base = readFileSync(join(subgraphSchemaFolder(name), "schema.graphql"), "utf8");
  if (profile === "production") {
    return base;
  }
  const development = readFileSync(
    join(subgraphSchemaFolder(name), "schema.development.graphql"),
    "utf8"
  );
  return `${base.trimEnd()}\n\n${development.trimStart()}`;
}
