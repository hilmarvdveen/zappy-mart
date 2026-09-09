import { orderHistorySize } from "@/configuration";
import type {
  OrderByIdQuery,
  OrderHistoryQuery,
} from "@/graphql/generated/graphql";
import { orderByIdQuery, orderHistoryQuery } from "@/graphql/operations";
import { readFromApi } from "@/server/storefrontClient";

export async function readOrderHistory(): Promise<OrderHistoryQuery | null> {
  return readFromApi(orderHistoryQuery, {
    first: orderHistorySize,
    after: null,
  });
}

export async function readOrder(
  orderId: string,
): Promise<OrderByIdQuery | null> {
  return readFromApi(orderByIdQuery, { id: orderId });
}
