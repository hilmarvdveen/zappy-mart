import type { QueryPlanSummary } from "./queryPlanPlugin.js";

export type IncomingHeaderName = "authorization" | "cookie" | "origin";

export type GatewayContext = {
  readonly incomingHeaders: Partial<Record<IncomingHeaderName, string>>;
  collectCookie(value: string): void;
  rememberQueryPlan(summary: QueryPlanSummary): void;
  rememberedQueryPlan(): QueryPlanSummary | null;
};
