import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createClient,
  normaliseAnswer,
  parseSetCookie,
  refreshCookieName,
} from "./client.mjs";

function jsonResponse(body, setCookieHeaders = []) {
  const headers = new Headers({ "content-type": "application/json" });
  for (const header of setCookieHeaders) {
    headers.append("set-cookie", header);
  }
  return new Response(JSON.stringify(body), { status: 200, headers });
}

function recordingFetch(responses) {
  const requests = [];
  const queue = [...responses];
  const fetchImplementation = async (url, request) => {
    requests.push({ url, ...request, body: JSON.parse(request.body) });
    return queue.shift() ?? jsonResponse({ data: {} });
  };
  return { requests, fetchImplementation };
}

test("a Set-Cookie header becomes a name and a value", () => {
  assert.deepEqual(
    parseSetCookie("zappy_cart=cart-1; Path=/; HttpOnly; Secure; SameSite=Lax"),
    { name: "zappy_cart", value: "cart-1", expired: false },
  );
});

test("Max-Age zero and a moment in the past both clear a cookie", () => {
  assert.equal(parseSetCookie("zappy_refresh=; Max-Age=0").expired, true);
  assert.equal(
    parseSetCookie(
      "zappy_refresh=gone; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ).expired,
    true,
  );
  assert.equal(parseSetCookie("zappy_refresh=alive; Max-Age=2592000").expired, false);
});

test("a header with no name at all is ignored", () => {
  assert.equal(parseSetCookie("HttpOnly"), null);
  assert.equal(parseSetCookie("=value"), null);
});

test("an answer without errors is read as an answer with none", () => {
  assert.deepEqual(normaliseAnswer({ data: { cart: null } }), {
    data: { cart: null },
    errors: [],
  });
});

test("an answer without data is read as an answer with none", () => {
  assert.deepEqual(
    normaliseAnswer({
      errors: [
        { message: "Origin is not allowed", locations: [], path: ["addToCart"] },
      ],
    }),
    { data: null, errors: [{ message: "Origin is not allowed" }] },
  );
});

test("every request carries the origin, the content type and the document", async () => {
  const { requests, fetchImplementation } = recordingFetch([
    jsonResponse({ data: { cart: { id: "cart-1" } } }),
  ]);
  const client = createClient({
    url: "http://localhost:5000/graphql",
    origin: "http://localhost:5173",
    fetchImplementation,
  });
  const { answer } = await client.send({
    source: "query Cart { cart { id } }",
    variables: { first: 5 },
  });
  assert.equal(requests[0].headers.origin, "http://localhost:5173");
  assert.equal(requests[0].headers["content-type"], "application/json");
  assert.equal(requests[0].body.query, "query Cart { cart { id } }");
  assert.deepEqual(requests[0].body.variables, { first: 5 });
  assert.deepEqual(answer.errors, []);
});

test("a request without the origin carries no origin header at all", async () => {
  const { requests, fetchImplementation } = recordingFetch([
    jsonResponse({ errors: [{ message: "Origin is missing" }] }),
  ]);
  const client = createClient({
    url: "http://localhost:5000/graphql",
    origin: "http://localhost:5173",
    fetchImplementation,
  });
  await client.send({
    source: "mutation AddToCart { addToCart(productId: \"product-18\") { cart { id } } }",
    variables: {},
    includeOrigin: false,
  });
  assert.equal("origin" in requests[0].headers, false);
});

test("the access token and the cookie jar ride on the next request", async () => {
  const { requests, fetchImplementation } = recordingFetch([
    jsonResponse({ data: { addToCart: {} } }, [
      "zappy_cart=cart-1; Path=/; HttpOnly",
    ]),
    jsonResponse({ data: { me: null } }),
  ]);
  const client = createClient({
    url: "http://localhost:5000/graphql",
    origin: "http://localhost:5173",
    fetchImplementation,
  });
  await client.send({ source: "mutation One { __typename }", variables: {} });
  client.useAccessToken("header.payload.signature");
  await client.send({ source: "query Two { __typename }", variables: {} });
  assert.equal("cookie" in requests[0].headers, false);
  assert.equal(requests[1].headers.cookie, "zappy_cart=cart-1");
  assert.equal(
    requests[1].headers.authorization,
    "Bearer header.payload.signature",
  );
  assert.equal(client.readAccessToken(), "header.payload.signature");
});

test("the replay sends the refresh cookie the rotation replaced", async () => {
  const { requests, fetchImplementation } = recordingFetch([
    jsonResponse({ data: { login: {} } }, [
      "zappy_cart=cart-1; Path=/",
      "zappy_refresh=refresh-one; Path=/graphql; HttpOnly",
    ]),
    jsonResponse({ data: { refreshSession: {} } }, [
      "zappy_refresh=refresh-two; Path=/graphql; HttpOnly",
    ]),
    jsonResponse({ data: { refreshSession: {} } }),
  ]);
  const client = createClient({
    url: "http://localhost:5000/graphql",
    origin: "http://localhost:5173",
    fetchImplementation,
  });
  await client.send({ source: "mutation Login { __typename }", variables: {} });
  await client.send({
    source: "mutation RefreshSession { __typename }",
    variables: {},
  });
  await client.send({
    source: "mutation RefreshSessionReplayed { __typename }",
    variables: {},
    replayPreviousRefreshCookie: true,
  });
  assert.equal(client.cookies.get(refreshCookieName), "refresh-two");
  assert.equal(requests[1].headers.cookie.includes("refresh-one"), true);
  assert.equal(requests[2].headers.cookie.includes("refresh-one"), true);
  assert.equal(requests[2].headers.cookie.includes("refresh-two"), false);
  assert.equal(requests[2].headers.cookie.includes("zappy_cart=cart-1"), true);
});

test("a logout throws the token and the refresh cookie away", async () => {
  const { requests, fetchImplementation } = recordingFetch([
    jsonResponse({ data: { login: {} } }, [
      "zappy_cart=cart-1; Path=/",
      "zappy_refresh=refresh-one; Path=/graphql",
    ]),
    jsonResponse({ data: { logout: { success: true } } }),
    jsonResponse({ data: { revokeSession: {} } }),
  ]);
  const client = createClient({
    url: "http://localhost:5000/graphql",
    origin: "http://localhost:5173",
    fetchImplementation,
  });
  await client.send({ source: "mutation Login { __typename }", variables: {} });
  client.useAccessToken("header.payload.signature");
  await client.send({ source: "mutation Logout { __typename }", variables: {} });
  client.forgetSession();
  await client.send({
    source: "mutation RevokeSession { __typename }",
    variables: {},
  });
  assert.equal("authorization" in requests[2].headers, false);
  assert.equal(requests[2].headers.cookie, "zappy_cart=cart-1");
});

test("a backend that is not there is one readable line", async () => {
  const fetchImplementation = async () => {
    throw Object.assign(new TypeError("fetch failed"), {
      cause: { code: "ECONNREFUSED" },
    });
  };
  const client = createClient({
    url: "http://localhost:1/graphql",
    origin: "http://localhost:5173",
    fetchImplementation,
  });
  await assert.rejects(
    () => client.send({ source: "query Ping { __typename }", variables: {} }),
    /Could not reach http:\/\/localhost:1\/graphql: ECONNREFUSED/,
  );
});

test("a body that is not JSON names the status and what came back", async () => {
  const fetchImplementation = async () =>
    new Response("<html>Not found</html>", { status: 404 });
  const client = createClient({
    url: "http://localhost:5000/graphql",
    origin: "http://localhost:5173",
    fetchImplementation,
  });
  await assert.rejects(
    () => client.send({ source: "query Ping { __typename }", variables: {} }),
    /answered status 404 with a body that is not JSON/,
  );
});
