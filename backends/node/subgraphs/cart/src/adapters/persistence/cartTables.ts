import type { Database } from "@zappy/shared";

export async function createCartTables(database: Database): Promise<void> {
  await database.execute(`
    create table if not exists shopping_cart (
      id text primary key,
      owner_key text not null unique,
      updated_at text not null
    )
  `);
  await database.execute(`
    create table if not exists cart_line (
      id text primary key,
      cart_id text not null,
      product_id text not null,
      quantity integer not null,
      ordinal integer not null
    )
  `);
}
