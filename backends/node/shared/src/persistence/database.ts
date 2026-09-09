export type QueryParameter = string | number | null;

export type Database = {
  execute(statement: string, parameters?: readonly QueryParameter[]): Promise<void>;
  queryAll<Row>(statement: string, parameters?: readonly QueryParameter[]): Promise<Row[]>;
  queryOne<Row>(statement: string, parameters?: readonly QueryParameter[]): Promise<Row | null>;
  transaction<Value>(work: () => Promise<Value>): Promise<Value>;
  close(): Promise<void>;
};

export function toPositionalPlaceholders(statement: string): string {
  let position = 0;
  return statement.replace(/\?/g, () => {
    position = position + 1;
    return `$${position}`;
  });
}
