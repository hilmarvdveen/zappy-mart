import { graphql, parse, type GraphQLSchema } from "graphql";
import { buildSubgraphSchema } from "@apollo/subgraph";
import type { GraphQLResolverMap } from "@apollo/subgraph";
import type { SubgraphName } from "../configuration.js";
import { readSubgraphSchema } from "../graphql/schemaFiles.js";
import type { SubgraphRequestContext } from "../graphql/requestContext.js";

export function buildTestSchema<Context>(
  name: SubgraphName,
  resolvers: Readonly<Record<string, unknown>>
): GraphQLSchema {
  return buildSubgraphSchema([
    {
      typeDefs: parse(readSubgraphSchema(name, "development")),
      resolvers: resolvers as GraphQLResolverMap<Context>
    }
  ]);
}

export type OperationAnswer = {
  readonly data: Record<string, unknown> | null;
  readonly errorMessages: readonly string[];
};

export async function runOperation<Context>(
  schema: GraphQLSchema,
  document: string,
  variableValues: Readonly<Record<string, unknown>>,
  contextValue: Context
): Promise<OperationAnswer> {
  const answer = await graphql({
    schema,
    source: document,
    variableValues: { ...variableValues },
    contextValue
  });
  return {
    data: asPlainObject(answer.data),
    errorMessages: (answer.errors ?? []).map((error) => error.message)
  };
}

function asPlainObject(data: unknown): Record<string, unknown> | null {
  return data === null || data === undefined ? null : (JSON.parse(JSON.stringify(data)) as Record<string, unknown>);
}

export function anonymousContext(overrides: Partial<SubgraphRequestContext> = {}): SubgraphRequestContext {
  const cookies: string[] = [];
  return {
    visitor: null,
    cartCookie: null,
    refreshCookie: null,
    origin: "http://localhost:5173",
    userAgent: "node:test",
    callerAddress: "127.0.0.1",
    forwarded: { authorization: null, cookie: null },
    setCookie(value: string): void {
      cookies.push(value);
    },
    ...overrides
  };
}

export function signedInContext(
  customerId: string,
  sessionId: string,
  overrides: Partial<SubgraphRequestContext> = {}
): SubgraphRequestContext {
  return anonymousContext({ visitor: { customerId, sessionId }, ...overrides });
}
