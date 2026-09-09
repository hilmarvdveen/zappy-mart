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

export type OutboxRow = {
  readonly id: string;
  readonly event: OrderPlaced;
  readonly attempts: number;
  readonly nextAttemptAt: string;
  readonly lastFailure: string | null;
};

export type OutboxStore = {
  write(event: OrderPlaced, recordedAt: string): Promise<string>;
  readDue(moment: string): Promise<readonly OutboxRow[]>;
  readUnpublished(): Promise<readonly OutboxRow[]>;
  readDeadLettered(): Promise<readonly OutboxRow[]>;
  markPublished(rowId: string, moment: string): Promise<void>;
  recordFailure(rowId: string, attempts: number, nextAttemptAt: string, reason: string): Promise<void>;
  markDeadLettered(rowId: string, attempts: number, moment: string, reason: string): Promise<void>;
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
  countPromotionUse(code: string, orderId: string, eventId: string): Promise<void>;
  sendConfirmation(event: OrderPlaced): Promise<void>;
};
