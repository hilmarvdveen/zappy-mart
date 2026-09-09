import type { UserError } from "@zappy/shared";
import type { Database } from "@zappy/shared";
import { newIdentifier, notAuthenticated, toContractDateTime, userError } from "@zappy/shared";
import type { Order } from "../domain/order.js";
import { placeOrderFrom } from "../domain/order.js";
import { orderPlaced } from "../domain/orderPlaced.js";
import type {
  CartToOrderReader,
  OrderPlacedConsumers,
  OrderRepository,
  OutboxStore,
  StockReserver
} from "./ports.js";

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
  stock: StockReserver,
  consumers: OrderPlacedConsumers,
  now: () => Date
): PlaceOrder {
  return {
    async place(customerId, idempotencyKey): Promise<PlaceOrderOutcome> {
      if (customerId === null) {
        return { kind: "refused", errors: [notAuthenticated] };
      }
      const checkoutKey = idempotencyKey ?? newIdentifier("checkout");

      const alreadyPlaced = await orders.readByIdempotencyKey(checkoutKey, customerId);
      if (alreadyPlaced !== null) {
        return { kind: "placed", order: alreadyPlaced };
      }

      const cart = await carts.readOrderableCart();
      if (cart === null || cart.lines.length === 0) {
        return {
          kind: "refused",
          errors: [userError("CART_EMPTY", "The cart has no lines, so there is nothing to order.")]
        };
      }

      const reservation = await stock.reserve(
        checkoutKey,
        cart.lines.map((line) => ({ productId: line.productId, quantity: line.quantity }))
      );
      if (!reservation.reserved) {
        const refusedLine = cart.lines.find((line) => line.productId === reservation.unavailableProductId);
        return {
          kind: "refused",
          errors: [
            userError(
              "OUT_OF_STOCK",
              `${refusedLine?.productName ?? reservation.unavailableProductId} has ${
                reservation.availableStock ?? 0
              } in stock.`
            )
          ]
        };
      }

      try {
        const placed = await database.transaction(async () => {
          const order = placeOrderFrom(
            newIdentifier("order"),
            await orders.nextSequenceNumber(),
            customerId,
            cart,
            toContractDateTime(now())
          );
          await orders.write(order, checkoutKey);
          await outbox.write(orderPlaced(order, cart.cartId));
          return order;
        });

        await announce(placed, cart.cartId, consumers);
        return { kind: "placed", order: placed };
      } catch (failure) {
        await stock.release(checkoutKey);
        throw failure;
      }
    }
  };
}

async function announce(
  order: Order,
  cartId: string,
  consumers: OrderPlacedConsumers
): Promise<void> {
  const event = orderPlaced(order, cartId);
  await consumers.emptyCart(cartId);
  await consumers.clearCartPromotion(cartId);
  if (order.promotionCode !== null) {
    await consumers.countPromotionUse(order.promotionCode, order.id);
  }
  await consumers.sendConfirmation(event);
}
