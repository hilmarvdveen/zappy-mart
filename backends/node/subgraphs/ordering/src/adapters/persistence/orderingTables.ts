import type { Database } from "@zappy/shared";

export async function createOrderingTables(database: Database): Promise<void> {
  await database.execute(`
    create table if not exists customer_order (
      id text primary key,
      sequence_number integer not null,
      order_number text not null unique,
      customer_id text not null,
      status text not null,
      promotion_code text,
      subtotal integer not null,
      discount integer not null,
      shipping integer not null,
      total integer not null,
      placed_at text not null,
      idempotency_key text not null unique
    )
  `);
  await database.execute(`
    create table if not exists order_line (
      order_id text not null,
      product_id text not null,
      product_name text not null,
      unit_price integer not null,
      quantity integer not null,
      ordinal integer not null
    )
  `);
  await database.execute(`
    create table if not exists outbox_message (
      id text primary key,
      event_name text not null,
      payload text not null,
      recorded_at text not null,
      published_at text
    )
  `);
}
