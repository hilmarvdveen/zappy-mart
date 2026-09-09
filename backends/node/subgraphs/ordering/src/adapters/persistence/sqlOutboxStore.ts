import type { Database } from "@zappy/shared";
import { newIdentifier } from "@zappy/shared";
import type { OrderPlaced } from "../../domain/orderPlaced.js";
import { orderPlacedEventName } from "../../domain/orderPlaced.js";
import type { OutboxRow, OutboxStore } from "../../application/ports.js";

type OutboxMessageRow = {
  readonly id: string;
  readonly payload: string;
  readonly attempts: number;
  readonly next_attempt_at: string;
  readonly last_failure: string | null;
};

function toOutboxRow(row: OutboxMessageRow): OutboxRow {
  return {
    id: row.id,
    event: JSON.parse(row.payload) as OrderPlaced,
    attempts: row.attempts,
    nextAttemptAt: row.next_attempt_at,
    lastFailure: row.last_failure
  };
}

const outboxColumns = "id, payload, attempts, next_attempt_at, last_failure";

export function sqlOutboxStore(database: Database): OutboxStore {
  return {
    async write(event: OrderPlaced, recordedAt: string): Promise<string> {
      const rowId = newIdentifier("outbox");
      await database.execute(
        `insert into outbox_message
           (id, event_name, payload, recorded_at, published_at, attempts, next_attempt_at, last_failure, dead_lettered_at)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [rowId, event.name, JSON.stringify(event), recordedAt, null, 0, recordedAt, null, null]
      );
      return rowId;
    },

    async readDue(moment: string): Promise<readonly OutboxRow[]> {
      const rows = await database.queryAll<OutboxMessageRow>(
        `select ${outboxColumns} from outbox_message
          where event_name = ? and published_at is null and dead_lettered_at is null and next_attempt_at <= ?
          order by recorded_at asc`,
        [orderPlacedEventName, moment]
      );
      return rows.map(toOutboxRow);
    },

    async readUnpublished(): Promise<readonly OutboxRow[]> {
      const rows = await database.queryAll<OutboxMessageRow>(
        `select ${outboxColumns} from outbox_message
          where event_name = ? and published_at is null
          order by recorded_at asc`,
        [orderPlacedEventName]
      );
      return rows.map(toOutboxRow);
    },

    async readDeadLettered(): Promise<readonly OutboxRow[]> {
      const rows = await database.queryAll<OutboxMessageRow>(
        `select ${outboxColumns} from outbox_message
          where event_name = ? and dead_lettered_at is not null
          order by recorded_at asc`,
        [orderPlacedEventName]
      );
      return rows.map(toOutboxRow);
    },

    async markPublished(rowId: string, moment: string): Promise<void> {
      await database.execute("update outbox_message set published_at = ? where id = ?", [moment, rowId]);
    },

    async recordFailure(
      rowId: string,
      attempts: number,
      nextAttemptAt: string,
      reason: string
    ): Promise<void> {
      await database.execute(
        "update outbox_message set attempts = ?, next_attempt_at = ?, last_failure = ? where id = ?",
        [attempts, nextAttemptAt, reason, rowId]
      );
    },

    async markDeadLettered(rowId: string, attempts: number, moment: string, reason: string): Promise<void> {
      await database.execute(
        "update outbox_message set attempts = ?, dead_lettered_at = ?, last_failure = ? where id = ?",
        [attempts, moment, reason, rowId]
      );
    }
  };
}
