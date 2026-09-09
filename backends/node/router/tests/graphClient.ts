export type GraphAnswer = {
  readonly data: Record<string, unknown> | null;
  readonly errors: readonly { readonly message: string }[];
};

export type GraphClient = {
  ask(document: string, variables?: Readonly<Record<string, unknown>>): Promise<GraphAnswer>;
  askWithoutOrigin(document: string, variables?: Readonly<Record<string, unknown>>): Promise<GraphAnswer>;
  useAccessToken(token: string | null): void;
  forgetCookies(): void;
  cookieHeader(): string;
};

export function graphClient(endpoint: string, origin = "http://localhost:5173"): GraphClient {
  const cookies = new Map<string, string>();
  let accessToken: string | null = null;

  async function send(
    document: string,
    variables: Readonly<Record<string, unknown>>,
    withOrigin: boolean
  ): Promise<GraphAnswer> {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (withOrigin) {
      headers["origin"] = origin;
    }
    if (accessToken !== null) {
      headers["authorization"] = `Bearer ${accessToken}`;
    }
    if (cookies.size > 0) {
      headers["cookie"] = [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    }
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: document, variables })
    });
    for (const value of response.headers.getSetCookie()) {
      const pair = value.split(";")[0] ?? "";
      const separator = pair.indexOf("=");
      if (separator > 0) {
        const name = pair.slice(0, separator);
        const stored = pair.slice(separator + 1);
        if (stored.length === 0) {
          cookies.delete(name);
        } else {
          cookies.set(name, stored);
        }
      }
    }
    const body = (await response.json()) as {
      data?: Record<string, unknown> | null;
      errors?: readonly { message: string }[];
    };
    return { data: body.data ?? null, errors: body.errors ?? [] };
  }

  return {
    ask(document, variables = {}) {
      return send(document, variables, true);
    },

    askWithoutOrigin(document, variables = {}) {
      return send(document, variables, false);
    },

    useAccessToken(token) {
      accessToken = token;
    },

    forgetCookies() {
      cookies.clear();
    },

    cookieHeader() {
      return [...cookies].map(([name, value]) => `${name}=${value}`).join("; ");
    }
  };
}
