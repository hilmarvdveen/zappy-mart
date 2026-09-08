import { startMockServer } from "../server.mjs";

export const testOrigin = "http://localhost:5173";

export async function startTestServer() {
  return startMockServer({ port: 0 });
}

export function createClient(url, { origin = testOrigin } = {}) {
  const cookies = new Map();
  let accessToken = null;

  function cookieHeader() {
    return [...cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  function rememberCookies(response) {
    for (const setCookie of response.headers.getSetCookie()) {
      const [pair, ...attributes] = setCookie.split(";");
      const separator = pair.indexOf("=");
      const name = pair.slice(0, separator).trim();
      const value = pair.slice(separator + 1).trim();
      const expiresNow = attributes.some((attribute) => attribute.trim().toLowerCase() === "max-age=0");
      if (expiresNow || value === "") {
        cookies.delete(name);
      } else {
        cookies.set(name, value);
      }
    }
  }

  return {
    get accessToken() {
      return accessToken;
    },
    set accessToken(token) {
      accessToken = token;
    },
    cookie(name) {
      return cookies.get(name) ?? null;
    },
    forgetCookies() {
      cookies.clear();
    },
    async run(query, variables = {}, { sendOrigin = true } = {}) {
      const headers = { "content-type": "application/json" };
      if (sendOrigin) {
        headers.origin = origin;
      }
      if (accessToken !== null) {
        headers.authorization = `Bearer ${accessToken}`;
      }
      if (cookies.size > 0) {
        headers.cookie = cookieHeader();
      }

      const response = await fetch(url, { method: "POST", headers, body: JSON.stringify({ query, variables }) });
      rememberCookies(response);
      const body = await response.json();

      return { status: response.status, data: body.data ?? null, errors: body.errors ?? null };
    }
  };
}

export async function signInSeedCustomer(client) {
  const answer = await client.run(
    `mutation SignIn($input: LoginInput!) {
      login(input: $input) {
        customer { id email name }
        accessToken
        accessTokenExpiresAt
        errors { code message field }
      }
    }`,
    { input: { email: "jane@example.com", password: "correct horse battery staple", device: "Node test runner" } }
  );
  client.accessToken = answer.data.login.accessToken;
  return answer.data.login;
}
