import { limitPageSize, pageOf, type Page } from "@zappy/shared";
import type { Order } from "../domain/order.js";
import type { OrderRepository } from "./ports.js";

export const defaultOrderPageSize = 10;

export type ReadOrders = {
  page(customerId: string | null, first: number | null, after: string | null): Promise<Page<Order>>;
  byIdentifier(customerId: string | null, orderId: string): Promise<Order | null>;
};

export function readOrders(orders: OrderRepository): ReadOrders {
  return {
    async page(customerId, first, after): Promise<Page<Order>> {
      const size = limitPageSize(first, defaultOrderPageSize);
      if (customerId === null) {
        return { edges: [], pageInfo: { hasNextPage: false, endCursor: null }, totalCount: 0 };
      }
      const found = await orders.readAllForCustomerNewestFirst(customerId);
      return pageOf(found, (order) => order.id, size, after);
    },

    async byIdentifier(customerId, orderId): Promise<Order | null> {
      if (customerId === null) {
        return null;
      }
      return orders.readById(orderId, customerId);
    }
  };
}
