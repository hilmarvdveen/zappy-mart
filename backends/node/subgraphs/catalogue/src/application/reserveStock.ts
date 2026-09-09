import type { Database } from "@zappy/shared";
import { reserveAllOrNothing, type StockLine } from "../domain/stockReservation.js";
import type { ProductRepository, StockReservationStore } from "./ports.js";

export type StockReservationAnswer = {
  readonly reserved: boolean;
  readonly unavailableProductId: string | null;
  readonly availableStock: number | null;
};

export type ReserveStock = {
  reserve(idempotencyKey: string, lines: readonly StockLine[]): Promise<StockReservationAnswer>;
  release(idempotencyKey: string): Promise<boolean>;
};

export function reserveStock(
  database: Database,
  products: ProductRepository,
  reservations: StockReservationStore,
  now: () => Date
): ReserveStock {
  return {
    async reserve(idempotencyKey, lines): Promise<StockReservationAnswer> {
      return database.transaction(async () => {
        const alreadyReserved = await reservations.readByIdempotencyKey(idempotencyKey);
        if (alreadyReserved !== null) {
          return { reserved: true, unavailableProductId: null, availableStock: null };
        }

        const stocked = new Map(
          (await products.readManyByIdentifier(lines.map((line) => line.productId))).map((product) => [
            product.id,
            product
          ])
        );
        const outcome = reserveAllOrNothing(stocked, lines);
        if (outcome.kind === "unavailable") {
          return {
            reserved: false,
            unavailableProductId: outcome.productId,
            availableStock: outcome.availableStock
          };
        }

        for (const product of outcome.reduced) {
          await products.writeStock(product.id, product.stock);
        }
        await reservations.write(idempotencyKey, lines, now().toISOString());
        return { reserved: true, unavailableProductId: null, availableStock: null };
      });
    },

    async release(idempotencyKey): Promise<boolean> {
      return database.transaction(async () => {
        const reserved = await reservations.readByIdempotencyKey(idempotencyKey);
        if (reserved === null) {
          return false;
        }
        const stocked = new Map(
          (await products.readManyByIdentifier(reserved.map((line) => line.productId))).map((product) => [
            product.id,
            product
          ])
        );
        for (const line of reserved) {
          const product = stocked.get(line.productId);
          if (product !== undefined) {
            await products.writeStock(product.id, product.stock + line.quantity);
          }
        }
        await reservations.remove(idempotencyKey);
        return true;
      });
    }
  };
}
