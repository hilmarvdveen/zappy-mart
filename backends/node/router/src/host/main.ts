import { createServer, type Server } from "node:http";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";
import { ApolloGateway } from "@apollo/gateway";
import {
  allowedOrigins,
  currentProfile,
  gatewayPort,
  subgraphNames,
  subgraphUrl,
  type SubgraphName
} from "@zappy/shared";
import {
  closeHttpServer,
  originCheckPlugin,
  requestTracingMiddleware,
  startRequestTracing
} from "@zappy/shared";
import { readSupergraph } from "../supergraphFile.js";
import { subgraphDataSource } from "../subgraphDataSource.js";
import { queryPlanPlugin, summariseQueryPlan, type QueryPlanSummary } from "../queryPlanPlugin.js";
import type { GatewayContext } from "../gatewayContext.js";

export const maximumQueryDepth = 12;

export const maximumQueryCost = 2000;

export const gatewayServiceName = "gateway";

export async function startGateway(): Promise<{ url: string; stop(): Promise<void> }> {
  startRequestTracing(gatewayServiceName);

  const gateway = new ApolloGateway({
    supergraphSdl: readSupergraph(currentProfile()),
    buildService({ name, url }) {
      return subgraphDataSource(name as SubgraphName, url ?? subgraphUrl(name as SubgraphName));
    },
    experimental_didResolveQueryPlan({ queryPlan, requestContext }) {
      (requestContext.context as GatewayContext).rememberQueryPlan(summariseQueryPlan(queryPlan));
    }
  });

  const application = express();
  application.use(requestTracingMiddleware(gatewayServiceName));
  const httpServer: Server = createServer(application);

  const server = new ApolloServer<GatewayContext>({
    gateway,
    introspection: true,
    includeStacktraceInErrorResponses: false,
    plugins: [
      originCheckPlugin<GatewayContext>((context) => context.incomingHeaders.origin ?? null),
      queryPlanPlugin(),
      ApolloServerPluginDrainHttpServer({ httpServer })
    ]
  });
  await server.start();

  application.get("/health", (_request: Request, response: Response) => {
    response.json({ gateway: "zappy-mart", status: "alive" });
  });

  application.get("/ready", (_request: Request, response: Response) => {
    readinessOfSubgraphs()
      .then((readiness) => {
        const ready = readiness.every((entry) => entry.ready);
        response.status(ready ? 200 : 503).json({ gateway: "zappy-mart", subgraphs: readiness });
      })
      .catch(() => {
        response.status(503).json({ gateway: "zappy-mart", status: "starting" });
      });
  });

  application.use(
    "/graphql",
    cors({ origin: [...allowedOrigins()], credentials: true }),
    express.json({ limit: "512kb" }),
    expressMiddleware(server, {
      context: async ({ req, res }): Promise<GatewayContext> => {
        let queryPlan: QueryPlanSummary | null = null;
        return {
          incomingHeaders: {
            ...(req.headers.authorization === undefined ? {} : { authorization: req.headers.authorization }),
            ...(req.headers.cookie === undefined ? {} : { cookie: req.headers.cookie }),
            ...(req.headers.origin === undefined ? {} : { origin: req.headers.origin as string })
          },
          collectCookie(value: string): void {
            res.append("set-cookie", value);
          },
          rememberQueryPlan(summary: QueryPlanSummary): void {
            queryPlan = summary;
          },
          rememberedQueryPlan(): QueryPlanSummary | null {
            return queryPlan;
          }
        };
      }
    })
  );

  await new Promise<void>((resolve) => httpServer.listen(gatewayPort, resolve));

  return {
    url: `http://localhost:${gatewayPort}/graphql`,
    async stop(): Promise<void> {
      await server.stop();
      await closeHttpServer(httpServer);
    }
  };
}

async function readinessOfSubgraphs(): Promise<readonly { name: SubgraphName; ready: boolean }[]> {
  return Promise.all(
    subgraphNames.map(async (name) => {
      try {
        const response = await fetch(subgraphUrl(name).replace("/graphql", "/ready"), {
          signal: AbortSignal.timeout(2000)
        });
        return { name, ready: response.ok };
      } catch {
        return { name, ready: false };
      }
    })
  );
}

if (process.argv[1]?.endsWith("main.js") === true) {
  const running = await startGateway();
  console.log(`the graph is serving ${running.url}`);
}
