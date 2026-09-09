import { readFileSync } from "node:fs";
import { join } from "node:path";
import { backendPath, currentProfile, type Profile } from "@zappy/shared";

export function supergraphFileFor(profile: Profile): string {
  return join(
    backendPath("router"),
    profile === "production" ? "supergraph.graphql" : "supergraph.development.graphql"
  );
}

export function readSupergraph(profile: Profile = currentProfile()): string {
  return readFileSync(supergraphFileFor(profile), "utf8");
}
