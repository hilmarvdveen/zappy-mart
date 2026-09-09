import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { Database } from "./database.js";
import { openSqliteDatabase } from "./sqliteDatabase.js";
import { openPostgresDatabase } from "./postgresDatabase.js";
import { backendPath } from "../seed/repositoryRoot.js";
import type { SubgraphName } from "../configuration.js";

export function openDatabaseFor(name: SubgraphName): Database {
  const connectionString = process.env[`ZAPPY_${name.toUpperCase()}_DATABASE_URL`];
  if (connectionString !== undefined && connectionString.startsWith("postgres")) {
    return openPostgresDatabase(connectionString);
  }
  const location = process.env[`ZAPPY_${name.toUpperCase()}_SQLITE_FILE`] ?? defaultSqliteFile(name);
  if (location !== ":memory:") {
    mkdirSync(dirname(location), { recursive: true });
  }
  return openSqliteDatabase(location);
}

export function openInMemoryDatabase(): Database {
  return openSqliteDatabase(":memory:");
}

function defaultSqliteFile(name: SubgraphName): string {
  return join(backendPath("data"), `${name}.sqlite`);
}
