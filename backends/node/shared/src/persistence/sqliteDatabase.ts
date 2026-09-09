import { DatabaseSync } from "node:sqlite";
import type { Database, QueryParameter } from "./database.js";

export function openSqliteDatabase(location: string): Database {
  const connection = new DatabaseSync(location);
  connection.exec("pragma journal_mode = wal");
  connection.exec("pragma foreign_keys = on");
  let depth = 0;

  return {
    async execute(statement: string, parameters: readonly QueryParameter[] = []): Promise<void> {
      connection.prepare(statement).run(...parameters);
    },

    async queryAll<Row>(statement: string, parameters: readonly QueryParameter[] = []): Promise<Row[]> {
      return connection.prepare(statement).all(...parameters) as Row[];
    },

    async queryOne<Row>(statement: string, parameters: readonly QueryParameter[] = []): Promise<Row | null> {
      const row = connection.prepare(statement).get(...parameters);
      return (row ?? null) as Row | null;
    },

    async transaction<Value>(work: () => Promise<Value>): Promise<Value> {
      if (depth > 0) {
        return work();
      }
      depth = depth + 1;
      connection.exec("begin immediate");
      try {
        const value = await work();
        connection.exec("commit");
        return value;
      } catch (failure) {
        connection.exec("rollback");
        throw failure;
      } finally {
        depth = depth - 1;
      }
    },

    async close(): Promise<void> {
      connection.close();
    }
  };
}
