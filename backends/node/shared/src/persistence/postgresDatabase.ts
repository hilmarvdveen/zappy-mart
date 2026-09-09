import pg from "pg";
import type { Database, QueryParameter } from "./database.js";
import { toPositionalPlaceholders } from "./database.js";

export function openPostgresDatabase(connectionString: string): Database {
  const pool = new pg.Pool({ connectionString });
  let transactionClient: pg.PoolClient | null = null;

  async function run(statement: string, parameters: readonly QueryParameter[]): Promise<pg.QueryResult> {
    const text = toPositionalPlaceholders(statement);
    if (transactionClient !== null) {
      return transactionClient.query(text, [...parameters]);
    }
    return pool.query(text, [...parameters]);
  }

  return {
    async execute(statement: string, parameters: readonly QueryParameter[] = []): Promise<void> {
      await run(statement, parameters);
    },

    async queryAll<Row>(statement: string, parameters: readonly QueryParameter[] = []): Promise<Row[]> {
      const result = await run(statement, parameters);
      return result.rows as Row[];
    },

    async queryOne<Row>(statement: string, parameters: readonly QueryParameter[] = []): Promise<Row | null> {
      const result = await run(statement, parameters);
      return (result.rows[0] ?? null) as Row | null;
    },

    async transaction<Value>(work: () => Promise<Value>): Promise<Value> {
      if (transactionClient !== null) {
        return work();
      }
      const client = await pool.connect();
      transactionClient = client;
      try {
        await client.query("begin");
        const value = await work();
        await client.query("commit");
        return value;
      } catch (failure) {
        await client.query("rollback");
        throw failure;
      } finally {
        transactionClient = null;
        client.release();
      }
    },

    async close(): Promise<void> {
      await pool.end();
    }
  };
}
