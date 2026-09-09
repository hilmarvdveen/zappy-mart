import type { Express, Request, Response } from "express";
import express from "express";
import { openDatabaseFor, startSubgraph, systemClock, type SubgraphRequestContext } from "@zappy/shared";
import { createOrderingTables } from "../adapters/persistence/orderingTables.js";
import { sqlOrderRepository } from "../adapters/persistence/sqlOrderRepository.js";
import { sqlOutboxStore } from "../adapters/persistence/sqlOutboxStore.js";
import { graphCartReader } from "../adapters/graph/graphCartReader.js";
import { graphStockReserver } from "../adapters/graph/graphStockReserver.js";
import { graphOrderPlacedConsumers } from "../adapters/graph/graphOrderPlacedConsumers.js";
import { idempotentPlaceOrder, inFlightCheckouts } from "../application/idempotentPlaceOrder.js";
import { outboxPublisher } from "../application/outboxPublisher.js";
import { placeOrder } from "../application/placeOrder.js";
import { readOrders } from "../application/readOrders.js";
import { stockReservationSaga } from "../application/stockReservationSaga.js";
import { orderingResolvers } from "../adapters/graphql/resolvers.js";
import type { OrderingContext } from "../adapters/graphql/context.js";

export async function startOrdering(): Promise<{ url: string; stop(): Promise<void> }> {
  const database = openDatabaseFor("ordering");
  await createOrderingTables(database);

  const orderStore = sqlOrderRepository(database);
  const outbox = sqlOutboxStore(database);
  const orders = readOrders(orderStore);
  const checkoutsBeingPlaced = inFlightCheckouts();

  const publisher = outboxPublisher(
    outbox,
    graphOrderPlacedConsumers({ authorization: null, cookie: null }),
    () => systemClock.now()
  );
  publisher.startPolling();

  const running = await startSubgraph<OrderingContext>({
    name: "ordering",
    resolvers: orderingResolvers,
    buildContext(base: SubgraphRequestContext): OrderingContext {
      return {
        ...base,
        orderStore,
        orders,
        checkout: idempotentPlaceOrder(
          placeOrder(
            database,
            orderStore,
            outbox,
            graphCartReader(base.forwarded),
            stockReservationSaga(graphStockReserver(base.forwarded)),
            publisher,
            () => systemClock.now()
          ),
          orderStore,
          checkoutsBeingPlaced
        ),
        async resetOwnData(): Promise<void> {
          await orderStore.removeEverything();
        }
      };
    },
    async isReady(): Promise<boolean> {
      await orderStore.nextSequenceNumber();
      return true;
    },
    addRoutes(application: Express): void {
      application.post(
        "/webhooks/payment",
        express.json({ limit: "16kb" }),
        (request: Request, response: Response) => {
          const body = request.body as { orderNumber?: string; status?: string };
          console.log(
            `payment webhook for order ${body.orderNumber ?? "unknown"} reported ${body.status ?? "unknown"}`
          );
          response.status(202).json({ received: true });
        }
      );
    }
  });

  return {
    url: running.url,
    async stop(): Promise<void> {
      publisher.stopPolling();
      await running.stop();
      await database.close();
    }
  };
}

if (process.argv[1]?.endsWith("main.js") === true) {
  const running = await startOrdering();
  console.log(`ordering is serving ${running.url}`);
}
