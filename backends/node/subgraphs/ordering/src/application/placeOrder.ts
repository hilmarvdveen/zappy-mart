import type { UserError } from "@zappy/shared";
import type { Database } from "@zappy/shared";
import { newIdentifier, notAuthenticated, toContractDateTime, userError } from "@zappy/shared";
import type { Order } from "../domain/order.js";
import { placeOrderFrom } from "../domain/order.js";
import { orderPlaced } from "../domain/orderPlaced.js";
import type { OutboxNudge } from "./outboxPublisher.js";
import type { StockReservationSaga } from "./stockReservationSaga.js";
import type { CartToOrderReader, OrderRepository, OutboxStore } from "./ports.js";

export type PlaceOrderOutcome =
  | { readonly kind: "placed"; readonly order: Order }
  | { readonly kind: "refused"; readonly errors: readonly UserError[] };

export type PlaceOrder = {
  place(customerId: string | null, idempotencyKey: string | null): Promise<PlaceOrderOutcome>;
};

export function placeOrder(
  database: Database,
  orders: OrderRepository,
  outbox: OutboxStore,
  carts: CartToOrderReader,
  saga: StockReservationSaga,
  publisher: OutboxNudge,
  now: () => Date
): PlaceOrder {
  return {
    async place(customerId, idempotencyKey): Promise<PlaceOrderOutcome> {
      if (customerId === null) {
        return { kind: "refused", errors: [notAuthenticated] };
      }
      const checkoutKey = idempotencyKey ?? newIdentifier("checkout");

      const cart = await carts.readOrderableCart();
      if (cart === null || cart.lines.length === 0) {
        return {
          kind: "refused",
          errors: [userError("CART_EMPTY", "The cart has no lines, so there is nothing to order.")]
        };
      }

      const outcome = await saga.withReservedStock(
        checkoutKey,
        cart.lines.map((line) => ({ productId: line.productId, quantity: line.quantity })),
        async () =>
          database.transaction(async () => {
            const order = placeOrderFrom(
              newIdentifier("order"),
              await orders.nextSequenceNumber(),
              customerId,
              cart,
              toContractDateTime(now())
            );
            await orders.write(order, checkoutKey);
            await outbox.write(orderPlaced(order, cart.cartId), now().toISOString());
            return order;
          })
      );

      if (outcome.kind === "unavailable") {
        const refusedLine = cart.lines.find((line) => line.productId === outcome.productId);
        return {
          kind: "refused",
          errors: [
            userError(
              "OUT_OF_STOCK",
              `${refusedLine?.productName ?? outcome.productId} has ${outcome.availableStock ?? 0} in stock.`
            )
          ]
        };
      }

      await nudgeThePublisher(publisher);
      return { kind: "placed", order: outcome.value };
    }
  };
}

async function nudgeThePublisher(publisher: OutboxNudge): Promise<void> {
  try {
    await publisher.publishDue();
  } catch {
    return;
  }
}
