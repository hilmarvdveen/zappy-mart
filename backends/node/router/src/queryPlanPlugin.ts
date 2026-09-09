import type { ApolloServerPlugin } from "@apollo/server";
import {
  serializeQueryPlan,
  type PlanNode,
  type QueryPlan,
  type SubscriptionNode
} from "@apollo/query-planner";
import { currentProfile } from "@zappy/shared";
import type { GatewayContext } from "./gatewayContext.js";

export const queryPlanHeaderName = "x-zappy-query-plan";

export const queryPlanExtensionName = "zappyQueryPlan";

export type QueryPlanSummary = {
  readonly plan: string;
  readonly fetchesPerSubgraph: Readonly<Record<string, number>>;
};

export function summariseQueryPlan(queryPlan: QueryPlan): QueryPlanSummary {
  const fetchesPerSubgraph: Record<string, number> = {};
  countFetches(queryPlan.node, fetchesPerSubgraph);
  return { plan: serializeQueryPlan(queryPlan), fetchesPerSubgraph };
}

function countFetches(
  node: PlanNode | SubscriptionNode | undefined,
  tally: Record<string, number>
): void {
  if (node === undefined) {
    return;
  }
  if (node.kind === "Fetch") {
    tally[node.serviceName] = (tally[node.serviceName] ?? 0) + 1;
    return;
  }
  if (node.kind === "Flatten") {
    countFetches(node.node, tally);
    return;
  }
  if (node.kind === "Sequence" || node.kind === "Parallel") {
    for (const child of node.nodes) {
      countFetches(child, tally);
    }
    return;
  }
  if (node.kind === "Condition") {
    countFetches(node.ifClause, tally);
    countFetches(node.elseClause, tally);
    return;
  }
  if (node.kind === "Subscription") {
    countFetches(node.primary, tally);
    countFetches(node.rest, tally);
    return;
  }
  countFetches(node.primary.node, tally);
  for (const deferred of node.deferred) {
    countFetches(deferred.node, tally);
  }
}

export function queryPlanIsAskedFor(headerValue: string | null | undefined): boolean {
  return currentProfile() === "development" && headerValue !== null && headerValue !== undefined;
}

export function queryPlanPlugin(): ApolloServerPlugin<GatewayContext> {
  return {
    async requestDidStart() {
      return {
        async willSendResponse(requestContext) {
          const summary = requestContext.contextValue.rememberedQueryPlan();
          if (summary === null) {
            return;
          }
          if (!queryPlanIsAskedFor(requestContext.request.http?.headers.get(queryPlanHeaderName))) {
            return;
          }
          if (requestContext.response.body.kind !== "single") {
            return;
          }
          requestContext.response.body.singleResult.extensions = {
            ...requestContext.response.body.singleResult.extensions,
            [queryPlanExtensionName]: summary
          };
        }
      };
    }
  };
}
