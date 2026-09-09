import type { Database } from "@zappy/shared";
import { newIdentifier } from "@zappy/shared";
import type { OrderPlaced } from "../../domain/orderPlaced.js";
import { orderPlacedEventName } from "../../domain/orderPlaced.js";
import type { OutboxStore } from "../../application/ports.js";

export function sqlOutboxStore(database: Database): OutboxStore {
  return {
    async write(event: OrderPlaced): Promise<void> {
      await database.execute(
        "insert into outbox_message (id, event_name, payload, recorded_at, published_at) values (?, ?, ?, ?, ?)",
        [newIdentifier("outbox"), event.name, JSON.stringify(event), event.placedAt, null]
      );
    },

    async readUnpublished(): Promise<readonly OrderPlaced[]> {
      const rows = await database.queryAll<{ payload: string }>(
        "select payload from outbox_message where event_name = ? and published_at is null order by recorded_at asc",
        [orderPlacedEventName]
      );
      return rows.map((row) => JSON.parse(row.payload) as OrderPlaced);
    }
  };
}
