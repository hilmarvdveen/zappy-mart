import type { Database } from "@zappy/shared";
import type { StockLine } from "../../domain/stockReservation.js";
import type { StockReservationStore } from "../../application/ports.js";

type ReservationRow = {
  readonly reserved_lines: string;
};

export function sqlStockReservationStore(database: Database): StockReservationStore {
  return {
    async readByIdempotencyKey(idempotencyKey: string): Promise<readonly StockLine[] | null> {
      const row = await database.queryOne<ReservationRow>(
        "select reserved_lines from stock_reservation where idempotency_key = ?",
        [idempotencyKey]
      );
      return row === null ? null : (JSON.parse(row.reserved_lines) as StockLine[]);
    },

    async write(idempotencyKey: string, lines: readonly StockLine[], recordedAt: string): Promise<void> {
      await database.execute(
        "insert into stock_reservation (idempotency_key, reserved_lines, recorded_at) values (?, ?, ?)",
        [idempotencyKey, JSON.stringify(lines), recordedAt]
      );
    },

    async remove(idempotencyKey: string): Promise<void> {
      await database.execute("delete from stock_reservation where idempotency_key = ?", [idempotencyKey]);
    }
  };
}
