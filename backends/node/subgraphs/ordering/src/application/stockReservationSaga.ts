import type { StockReserver } from "./ports.js";

export type ReservedLine = {
  readonly productId: string;
  readonly quantity: number;
};

export type SagaOutcome<Value> =
  | { readonly kind: "completed"; readonly value: Value }
  | {
      readonly kind: "unavailable";
      readonly productId: string | null;
      readonly availableStock: number | null;
    };

export type StockReservationSaga = {
  withReservedStock<Value>(
    idempotencyKey: string,
    lines: readonly ReservedLine[],
    work: () => Promise<Value>
  ): Promise<SagaOutcome<Value>>;
};

export function stockReservationSaga(stock: StockReserver): StockReservationSaga {
  async function compensate(idempotencyKey: string): Promise<void> {
    try {
      await stock.release(idempotencyKey);
    } catch {
      return;
    }
  }

  return {
    async withReservedStock<Value>(
      idempotencyKey: string,
      lines: readonly ReservedLine[],
      work: () => Promise<Value>
    ): Promise<SagaOutcome<Value>> {
      const reservation = await stock.reserve(idempotencyKey, lines);
      if (!reservation.reserved) {
        return {
          kind: "unavailable",
          productId: reservation.unavailableProductId,
          availableStock: reservation.availableStock
        };
      }
      try {
        return { kind: "completed", value: await work() };
      } catch (failure) {
        await compensate(idempotencyKey);
        throw failure;
      }
    }
  };
}
