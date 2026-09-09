import { createServer, type Server } from "node:http";
import { parse } from "graphql";
import express, { type Express, type Request, type Response } from "express";
import { ApolloServer } from "@apollo/server";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { expressMiddleware } from "@as-integrations/express5";
import { buildSubgraphSchema } from "@apollo/subgraph";
import type { GraphQLResolverMap } from "@apollo/subgraph";
import { currentProfile, portFor, cartCookieName, refreshCookieName, type SubgraphName } from "../configuration.js";
import { readSubgraphSchema } from "./schemaFiles.js";
import { originCheckPlugin } from "./originCheckPlugin.js";
import type { SubgraphRequestContext } from "./requestContext.js";
import { readCookie } from "../security/cookies.js";
import { remoteAccessTokenVerifier, type AccessTokenVerifier } from "../security/accessToken.js";

export type GeneratedResolverMap = Readonly<Record<string, unknown>>;

export type SubgraphDefinition<Context extends SubgraphRequestContext> = {
  readonly name: SubgraphName;
  readonly resolvers: GeneratedResolverMap;
  buildContext(base: SubgraphRequestContext): Context;
  isReady(): Promise<boolean>;
  addRoutes?(application: Express): void;
};

export type RunningSubgraph = {
  readonly url: string;
  stop(): Promise<void>;
};

export async function startSubgraph<Context extends SubgraphRequestContext>(
  definition: SubgraphDefinition<Context>,
  verifier: AccessTokenVerifier = remoteAccessTokenVerifier()
): Promise<RunningSubgraph> {
  const profile = currentProfile();
  const schema = buildSubgraphSchema([
    {
      typeDefs: parse(readSubgraphSchema(definition.name, profile)),
      resolvers: definition.resolvers as GraphQLResolverMap<Context>
    }
  ]);

  const application = express();
  const httpServer: Server = createServer(application);

  const server = new ApolloServer<Context>({
    schema,
    introspection: true,
    includeStacktraceInErrorResponses: false,
    plugins: [
      originCheckPlugin<Context>((context) => context.origin),
      ApolloServerPluginDrainHttpServer({ httpServer })
    ]
  });
  await server.start();

  application.get("/health", (_request: Request, response: Response) => {
    response.json({ subgraph: definition.name, status: "alive" });
  });

  application.get("/ready", (_request: Request, response: Response) => {
    definition
      .isReady()
      .then((ready) => {
        response.status(ready ? 200 : 503).json({ subgraph: definition.name, status: ready ? "ready" : "starting" });
      })
      .catch(() => {
        response.status(503).json({ subgraph: definition.name, status: "starting" });
      });
  });

  definition.addRoutes?.(application);

  application.use(
    "/graphql",
    express.json({ limit: "512kb" }),
    expressMiddleware(server, {
      context: async ({ req, res }) => {
        const cookieHeader = req.headers.cookie ?? null;
        const authorization = req.headers.authorization ?? null;
        const base: SubgraphRequestContext = {
          visitor: await verifier.verify(authorization),
          cartCookie: readCookie(cookieHeader, cartCookieName),
          refreshCookie: readCookie(cookieHeader, refreshCookieName),
          origin: (req.headers.origin as string | undefined) ?? null,
          userAgent: (req.headers["user-agent"] as string | undefined) ?? null,
          callerAddress: req.ip ?? "unknown",
          forwarded: { authorization, cookie: cookieHeader },
          setCookie(value: string): void {
            res.append("set-cookie", value);
          }
        };
        return definition.buildContext(base);
      }
    })
  );

  const port = portFor(definition.name);
  await new Promise<void>((resolve) => httpServer.listen(port, resolve));

  return {
    url: `http://localhost:${port}/graphql`,
    async stop(): Promise<void> {
      await server.stop();
      await closeHttpServer(httpServer);
    }
  };
}

export async function closeHttpServer(httpServer: Server): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    httpServer.close((failure) => {
      if (failure === undefined || (failure as NodeJS.ErrnoException).code === 'ERR_SERVER_NOT_RUNNING') {
        resolve();
        return;
      }
      reject(failure);
    });
  });
}
