import type { Database } from "@zappy/shared";

export async function createPromotionTables(database: Database): Promise<void> {
  await database.execute(`
    create table if not exists promotion_code (
      code text primary key,
      kind text not null,
      percentage integer,
      amount_value integer,
      minimum_subtotal integer,
      valid_from text not null,
      valid_until text not null,
      usage_limit integer,
      times_used integer not null
    )
  `);
  await database.execute(`
    create table if not exists applied_promotion (
      cart_id text primary key,
      code text not null
    )
  `);
}
