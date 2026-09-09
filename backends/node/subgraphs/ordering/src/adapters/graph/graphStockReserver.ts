import type { ForwardedHeaders } from "@zappy/shared";
import { askSubgraph } from "@zappy/shared";
import type { StockReservationAnswer, StockReserver } from "../../application/ports.js";

const reserveStockDocument = `
  mutation ReserveStock($idempotencyKey: String!, $lines: [StockLine!]!) {
    reserveStock(idempotencyKey: $idempotencyKey, lines: $lines) {
      reserved
      unavailableProductId
      availableStock
    }
  }
`;

const releaseStockDocument = `
  mutation ReleaseStock($idempotencyKey: String!) {
    releaseStock(idempotencyKey: $idempotencyKey)
  }
`;

export function graphStockReserver(forwarded: ForwardedHeaders): StockReserver {
  return {
    async reserve(idempotencyKey, lines): Promise<StockReservationAnswer> {
      const answer = await askSubgraph<{ reserveStock: StockReservationAnswer }>(
        "catalogue",
        reserveStockDocument,
        { idempotencyKey, lines: lines.map((line) => ({ ...line })) },
        forwarded
      );
      return answer.reserveStock;
    },

    async release(idempotencyKey): Promise<boolean> {
      const answer = await askSubgraph<{ releaseStock: boolean }>(
        "catalogue",
        releaseStockDocument,
        { idempotencyKey },
        forwarded
      );
      return answer.releaseStock;
    }
  };
}
