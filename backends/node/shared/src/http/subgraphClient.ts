import { subgraphRequestTimeoutInMilliseconds, type SubgraphName, subgraphUrl } from "../configuration.js";
import { internalOrigin } from "../security/originCheck.js";
import { traceHeadersOfActiveContext } from "../telemetry/requestTracing.js";
import {
  defaultRetryBudgetSettings,
  retryBudget,
  retryPlan,
  withRetries,
  type RetryBudget,
  type RetryPlan
} from "./retryPolicy.js";

export type ForwardedHeaders = {
  readonly authorization: string | null;
  readonly cookie: string | null;
};

export type SubgraphCallFailure = {
  readonly subgraph: SubgraphName;
  readonly reason: string;
  readonly retryable: boolean;
};

export class SubgraphUnavailableError extends Error {
  readonly subgraph: SubgraphName;
  readonly retryable: boolean;

  constructor(failure: SubgraphCallFailure) {
    super(`The ${failure.subgraph} subgraph did not answer: ${failure.reason}`);
    this.name = "SubgraphUnavailableError";
    this.subgraph = failure.subgraph;
    this.retryable = failure.retryable;
  }
}

export function isRetryableFailure(failure: unknown): boolean {
  return failure instanceof SubgraphUnavailableError && failure.retryable;
}

export type SubgraphCallOptions = {
  readonly idempotent?: boolean;
  readonly plan?: RetryPlan;
};

const budgetPerSubgraph = new Map<SubgraphName, RetryBudget>();

export function retryBudgetFor(subgraph: SubgraphName): RetryBudget {
  const existing = budgetPerSubgraph.get(subgraph);
  if (existing !== undefined) {
    return existing;
  }
  const created = retryBudget(defaultRetryBudgetSettings);
  budgetPerSubgraph.set(subgraph, created);
  return created;
}

export async function askSubgraph<Data>(
  subgraph: SubgraphName,
  document: string,
  variables: Readonly<Record<string, unknown>>,
  forwarded: ForwardedHeaders,
  options: SubgraphCallOptions = {}
): Promise<Data> {
  if (options.idempotent !== true) {
    return askOnce<Data>(subgraph, document, variables, forwarded);
  }
  const plan = options.plan ?? retryPlan(retryBudgetFor(subgraph));
  return withRetries(plan, isRetryableFailure, () =>
    askOnce<Data>(subgraph, document, variables, forwarded)
  );
}

async function askOnce<Data>(
  subgraph: SubgraphName,
  document: string,
  variables: Readonly<Record<string, unknown>>,
  forwarded: ForwardedHeaders
): Promise<Data> {
  const headers: Record<string, string> = {
    "content-type": "application/json",
    origin: internalOrigin,
    ...traceHeadersOfActiveContext()
  };
  if (forwarded.authorization !== null) {
    headers["authorization"] = forwarded.authorization;
  }
  if (forwarded.cookie !== null) {
    headers["cookie"] = forwarded.cookie;
  }

  let response: Response;
  try {
    response = await fetch(subgraphUrl(subgraph), {
      method: "POST",
      headers,
      body: JSON.stringify({ query: document, variables }),
      signal: AbortSignal.timeout(subgraphRequestTimeoutInMilliseconds())
    });
  } catch (failure) {
    throw new SubgraphUnavailableError({
      subgraph,
      reason: failure instanceof Error ? failure.message : String(failure),
      retryable: true
    });
  }

  if (!response.ok) {
    throw new SubgraphUnavailableError({
      subgraph,
      reason: `status ${response.status}`,
      retryable: response.status >= 500
    });
  }

  const body = (await response.json()) as { data?: Data; errors?: readonly { message: string }[] };
  if (body.errors !== undefined && body.errors.length > 0) {
    throw new SubgraphUnavailableError({
      subgraph,
      reason: body.errors.map((error) => error.message).join(", "),
      retryable: false
    });
  }
  if (body.data === undefined) {
    throw new SubgraphUnavailableError({ subgraph, reason: "an answer with no data", retryable: false });
  }
  return body.data;
}
