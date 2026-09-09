import type { Order, OrderableCart } from "../domain/order.js";
import type { OrderPlaced } from "../domain/orderPlaced.js";

export type OrderRepository = {
  readById(orderId: string, customerId: string): Promise<Order | null>;
  readByIdempotencyKey(idempotencyKey: string, customerId: string): Promise<Order | null>;
  readAllForCustomerNewestFirst(customerId: string): Promise<readonly Order[]>;
  nextSequenceNumber(): Promise<number>;
  write(order: Order, idempotencyKey: string): Promise<void>;
  removeEverything(): Promise<void>;
};

export type OutboxStore = {
  write(event: OrderPlaced): Promise<void>;
  readUnpublished(): Promise<readonly OrderPlaced[]>;
};

export type CartToOrderReader = {
  readOrderableCart(): Promise<OrderableCart | null>;
};

export type StockReservationAnswer = {
  readonly reserved: boolean;
  readonly unavailableProductId: string | null;
  readonly availableStock: number | null;
};

export type StockReserver = {
  reserve(
    idempotencyKey: string,
    lines: readonly { readonly productId: string; readonly quantity: number }[]
  ): Promise<StockReservationAnswer>;
  release(idempotencyKey: string): Promise<boolean>;
};

export type OrderPlacedConsumers = {
  emptyCart(cartId: string): Promise<void>;
  clearCartPromotion(cartId: string): Promise<void>;
  countPromotionUse(code: string, orderId: string): Promise<void>;
  sendConfirmation(event: OrderPlaced): Promise<void>;
};
