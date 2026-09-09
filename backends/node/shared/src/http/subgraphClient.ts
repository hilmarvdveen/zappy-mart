import { subgraphRequestTimeoutInMilliseconds, type SubgraphName, subgraphUrl } from "../configuration.js";

export type ForwardedHeaders = {
  readonly authorization: string | null;
  readonly cookie: string | null;
};

export type SubgraphCallFailure = {
  readonly subgraph: SubgraphName;
  readonly reason: string;
};

export class SubgraphUnavailableError extends Error {
  readonly subgraph: SubgraphName;

  constructor(failure: SubgraphCallFailure) {
    super(`The ${failure.subgraph} subgraph did not answer: ${failure.reason}`);
    this.name = "SubgraphUnavailableError";
    this.subgraph = failure.subgraph;
  }
}

export async function askSubgraph<Data>(
  subgraph: SubgraphName,
  document: string,
  variables: Readonly<Record<string, unknown>>,
  forwarded: ForwardedHeaders
): Promise<Data> {
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (forwarded.authorization !== null) {
    headers["authorization"] = forwarded.authorization;
  }
  if (forwarded.cookie !== null) {
    headers["cookie"] = forwarded.cookie;
  }
  headers["origin"] = "internal";

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
      reason: failure instanceof Error ? failure.message : String(failure)
    });
  }

  if (!response.ok) {
    throw new SubgraphUnavailableError({ subgraph, reason: `status ${response.status}` });
  }

  const body = (await response.json()) as { data?: Data; errors?: readonly { message: string }[] };
  if (body.errors !== undefined && body.errors.length > 0) {
    throw new SubgraphUnavailableError({
      subgraph,
      reason: body.errors.map((error) => error.message).join(", ")
    });
  }
  if (body.data === undefined) {
    throw new SubgraphUnavailableError({ subgraph, reason: "an answer with no data" });
  }
  return body.data;
}
