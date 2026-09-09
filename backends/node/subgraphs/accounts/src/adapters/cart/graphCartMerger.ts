import type { ForwardedHeaders } from "@zappy/shared";
import { askSubgraph } from "@zappy/shared";
import type { CartMerger } from "../../application/ports.js";

const mergeAnonymousCartDocument = `
  mutation MergeAnonymousCart($visitorKey: String!, $customerId: ID!) {
    mergeAnonymousCart(visitorKey: $visitorKey, customerId: $customerId)
  }
`;

export function graphCartMerger(forwarded: ForwardedHeaders): CartMerger {
  return {
    async moveAnonymousCart(visitorKey: string, customerId: string): Promise<void> {
      await askSubgraph("cart", mergeAnonymousCartDocument, { visitorKey, customerId }, forwarded);
    }
  };
}
