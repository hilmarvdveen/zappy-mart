import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "graphql";
import { composeServices } from "@apollo/composition";

const backendFolder = dirname(dirname(fileURLToPath(import.meta.url)));

export const subgraphNames = ["catalogue", "cart", "promotions", "ordering", "accounts"];

export const subgraphPorts = {
  catalogue: 4101,
  cart: 4102,
  promotions: 4103,
  ordering: 4104,
  accounts: 4105
};

export function readSubgraphSchema(name, profile) {
  const folder = join(backendFolder, "subgraphs", name);
  const base = readFileSync(join(folder, "schema.graphql"), "utf8");
  if (profile === "production") {
    return base;
  }
  const development = readFileSync(join(folder, "schema.development.graphql"), "utf8");
  return `${base.trimEnd()}\n\n${development.trimStart()}`;
}

export function composeSupergraph(profile) {
  const services = subgraphNames.map((name) => ({
    name,
    url: `http://localhost:${subgraphPorts[name]}/graphql`,
    typeDefs: parse(readSubgraphSchema(name, profile))
  }));

  const result = composeServices(services);
  if (result.errors !== undefined && result.errors.length > 0) {
    const listed = result.errors.map((error) => `  ${error.message}`).join("\n");
    throw new Error(`Composition failed for the ${profile} profile:\n${listed}`);
  }
  return result.supergraphSdl;
}

export function supergraphFileFor(profile) {
  return profile === "production"
    ? join(backendFolder, "router", "supergraph.graphql")
    : join(backendFolder, "router", "supergraph.development.graphql");
}

function writeSupergraph(profile) {
  const supergraphSdl = composeSupergraph(profile);
  const file = supergraphFileFor(profile);
  writeFileSync(file, supergraphSdl, "utf8");
  return { file, lineCount: supergraphSdl.split("\n").length };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  for (const profile of ["production", "development"]) {
    const written = writeSupergraph(profile);
    console.log(`composed the ${profile} supergraph into ${written.file} (${written.lineCount} lines)`);
  }
}
