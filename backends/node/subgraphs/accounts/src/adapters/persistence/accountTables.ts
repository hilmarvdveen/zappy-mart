import type { Database } from "@zappy/shared";

export async function createAccountTables(database: Database): Promise<void> {
  await database.execute(`
    create table if not exists customer (
      id text primary key,
      email text not null unique,
      name text not null,
      created_at text not null,
      password_hash text not null
    )
  `);
  await database.execute(`
    create table if not exists session (
      id text primary key,
      ordinal integer not null,
      customer_id text not null,
      device text not null,
      created_at text not null,
      last_used_at text not null,
      expires_at text not null,
      revoked integer not null
    )
  `);
  await database.execute(`
    create table if not exists refresh_token (
      id text primary key,
      session_id text not null,
      token_hash text not null unique,
      created_at text not null,
      expires_at text not null,
      rotated integer not null
    )
  `);
  await database.execute(`
    create table if not exists wishlist_entry (
      owner_key text not null,
      product_id text not null,
      added_at text not null,
      ordinal integer not null
    )
  `);
}
