import type { SubgraphRequestContext } from "@zappy/shared";
import type { PlaceOrder } from "../../application/placeOrder.js";
import type { ReadOrders } from "../../application/readOrders.js";
import type { OrderRepository } from "../../application/ports.js";

export type OrderingContext = SubgraphRequestContext & {
  readonly checkout: PlaceOrder;
  readonly orders: ReadOrders;
  readonly orderStore: OrderRepository;
  resetOwnData(): Promise<void>;
};
