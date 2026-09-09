import type { Database } from "@zappy/shared";

export async function createCatalogueTables(database: Database): Promise<void> {
  await database.execute(`
    create table if not exists category (
      id text primary key,
      name text not null,
      slug text not null unique,
      ordinal integer not null
    )
  `);
  await database.execute(`
    create table if not exists product (
      id text primary key,
      name text not null,
      slug text not null unique,
      description text not null,
      price_amount integer not null,
      price_currency text not null,
      category_slug text not null,
      stock integer not null,
      image_url text,
      ordinal integer not null
    )
  `);
  await database.execute(`
    create table if not exists stock_reservation (
      idempotency_key text primary key,
      reserved_lines text not null,
      recorded_at text not null
    )
  `);
}
