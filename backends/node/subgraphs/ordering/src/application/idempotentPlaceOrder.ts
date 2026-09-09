import type { PlaceOrder, PlaceOrderOutcome } from "./placeOrder.js";
import type { OrderRepository } from "./ports.js";

export type InFlightCheckouts = Map<string, Promise<PlaceOrderOutcome>>;

export function inFlightCheckouts(): InFlightCheckouts {
  return new Map<string, Promise<PlaceOrderOutcome>>();
}

export function idempotentPlaceOrder(
  inner: PlaceOrder,
  orders: OrderRepository,
  inFlight: InFlightCheckouts
): PlaceOrder {
  return {
    async place(customerId, idempotencyKey): Promise<PlaceOrderOutcome> {
      if (customerId === null || idempotencyKey === null) {
        return inner.place(customerId, idempotencyKey);
      }

      const alreadyPlaced = await orders.readByIdempotencyKey(idempotencyKey, customerId);
      if (alreadyPlaced !== null) {
        return { kind: "placed", order: alreadyPlaced };
      }

      const checkout = `${customerId}:${idempotencyKey}`;
      const running = inFlight.get(checkout);
      if (running !== undefined) {
        return running;
      }

      const started = inner.place(customerId, idempotencyKey).finally(() => {
        inFlight.delete(checkout);
      });
      inFlight.set(checkout, started);
      return started;
    }
  };
}
