import assert from "node:assert/strict";
import { test } from "node:test";
import { readScenarios, resetSeedSource } from "./documents.mjs";
import { isPlaceholder } from "./placeholders.mjs";
import { defaultOrigin, parseCommandLine, runConformance } from "./run.mjs";

const scenarios = await readScenarios();

const cookiesByScenario = new Map([
  ["cart-add", ["zappy_cart=cart-1; Path=/; HttpOnly; Secure; SameSite=Lax"]],
  ["register", ["zappy_refresh=refresh-one; Path=/graphql; HttpOnly"]],
  ["login", ["zappy_refresh=refresh-two; Path=/graphql; HttpOnly"]],
  ["refresh-session", ["zappy_refresh=refresh-three; Path=/graphql; HttpOnly"]],
  ["logout", ["zappy_refresh=; Path=/graphql; Max-Age=0"]],
  ["login-again", ["zappy_refresh=refresh-four; Path=/graphql; HttpOnly"]],
  [
    "login-second-device",
    ["zappy_refresh=refresh-five; Path=/graphql; HttpOnly"],
  ],
  ["logout-again", ["zappy_refresh=; Path=/graphql; Max-Age=0"]],
  ["wishlist-add", ["zappy_cart=cart-2; Path=/; HttpOnly"]],
  [
    "wishlist-merge-on-login",
    ["zappy_refresh=refresh-six; Path=/graphql; HttpOnly"],
  ],
]);

function fillPlaceholders(value, nextValue) {
  if (isPlaceholder(value)) {
    return nextValue(value);
  }
  if (Array.isArray(value)) {
    return value.map((entry) => fillPlaceholders(entry, nextValue));
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        fillPlaceholders(entry, nextValue),
      ]),
    );
  }
  return value;
}

function createBackend({ answerFor = (scenario) => scenario.expected } = {}) {
  const requests = [];
  const answers = new Map();
  let counter = 0;
  const nextValue = (placeholder) => {
    counter += 1;
    if (placeholder === "@dateTime") {
      return "2026-09-09T14:30:00Z";
    }
    if (placeholder === "@token") {
      return `header.payload.signature-${counter}`;
    }
    if (placeholder === "@cursor") {
      return `cursor-${counter}`;
    }
    return `identifier-${counter}`;
  };
  const respond = (body, setCookieHeaders = []) => {
    const headers = new Headers({ "content-type": "application/json" });
    for (const header of setCookieHeaders) {
      headers.append("set-cookie", header);
    }
    return new Response(JSON.stringify(body), { status: 200, headers });
  };
  const fetchImplementation = async (url, request) => {
    const body = JSON.parse(request.body);
    if (requests.length === 0) {
      assert.equal(body.query, resetSeedSource);
      requests.push({ name: "reset-seed", headers: request.headers });
      return respond({
        data: {
          resetSeed: { success: true, loadedProducts: 20, errors: [] },
        },
      });
    }
    const scenario = scenarios[requests.length - 1];
    assert.equal(body.query, scenario.source, scenario.name);
    requests.push({
      name: scenario.name,
      headers: request.headers,
      variables: body.variables,
    });
    const answer = fillPlaceholders(answerFor(scenario), nextValue);
    answers.set(scenario.name, answer);
    const wire = {};
    if (answer.data !== null) {
      wire.data = answer.data;
    }
    if (answer.errors.length > 0) {
      wire.errors = answer.errors.map((error) => ({
        ...error,
        locations: [{ line: 1, column: 1 }],
      }));
    }
    return respond(wire, cookiesByScenario.get(scenario.name) ?? []);
  };
  return { requests, answers, fetchImplementation };
}

function requestNamed(requests, name) {
  const request = requests.find((entry) => entry.name === name);
  assert.notEqual(request, undefined, `${name} was never sent`);
  return request;
}

test("the run walks the scenarios in order and matches every answer", async () => {
  const backend = createBackend();
  const lines = [];
  const result = await runConformance({
    url: "http://localhost:5000/graphql",
    fetchImplementation: backend.fetchImplementation,
    write: (line) => lines.push(line),
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.matched, scenarios.length);
  assert.equal(backend.requests.length, scenarios.length + 1);
  assert.deepEqual(
    backend.requests.map((request) => request.name),
    ["reset-seed", ...scenarios.map((scenario) => scenario.name)],
  );
  assert.equal(
    lines.at(-1),
    `${scenarios.length} of ${scenarios.length} scenarios matched contract/expected`,
  );
});

test("every request carries the origin except the one that proves the check", async () => {
  const backend = createBackend();
  await runConformance({
    url: "http://localhost:5000/graphql",
    fetchImplementation: backend.fetchImplementation,
    write: () => {},
  });
  for (const request of backend.requests) {
    if (request.name === "mutation-without-origin") {
      assert.equal("origin" in request.headers, false);
      continue;
    }
    assert.equal(request.headers.origin, defaultOrigin, request.name);
  }
});

test("the access token a login answers with rides on the requests after it", async () => {
  const backend = createBackend();
  await runConformance({
    url: "http://localhost:5000/graphql",
    fetchImplementation: backend.fetchImplementation,
    write: () => {},
  });
  const registerToken = backend.answers.get("register").data.register.accessToken;
  const loginToken = backend.answers.get("login").data.login.accessToken;
  const mergeToken =
    backend.answers.get("wishlist-merge-on-login").data.login.accessToken;
  assert.equal("authorization" in requestNamed(backend.requests, "cart-add").headers, false);
  assert.equal(
    requestNamed(backend.requests, "register-duplicate-email").headers
      .authorization,
    `Bearer ${registerToken}`,
  );
  assert.equal(
    requestNamed(backend.requests, "refresh-session").headers.authorization,
    `Bearer ${loginToken}`,
  );
  assert.equal(
    requestNamed(backend.requests, "order-place").headers.authorization,
    `Bearer ${mergeToken}`,
  );
});

test("a logout throws the token away, so the scenarios after it are anonymous", async () => {
  const backend = createBackend();
  await runConformance({
    url: "http://localhost:5000/graphql",
    fetchImplementation: backend.fetchImplementation,
    write: () => {},
  });
  for (const name of [
    "login-again",
    "revoke-session-signed-out",
    "wishlist-add",
    "wishlist-remove",
  ]) {
    assert.equal(
      "authorization" in requestNamed(backend.requests, name).headers,
      false,
      name,
    );
  }
  const phoneToken =
    backend.answers.get("login-second-device").data.login.accessToken;
  assert.equal(
    requestNamed(backend.requests, "revoke-session").headers.authorization,
    `Bearer ${phoneToken}`,
  );
});

test("the cart cookie follows the visitor and the replay sends the rotated token", async () => {
  const backend = createBackend();
  await runConformance({
    url: "http://localhost:5000/graphql",
    fetchImplementation: backend.fetchImplementation,
    write: () => {},
  });
  assert.equal(
    requestNamed(backend.requests, "cart-add-again-raises-quantity").headers
      .cookie,
    "zappy_cart=cart-1",
  );
  const replay = requestNamed(backend.requests, "refresh-session-replayed");
  assert.equal(replay.headers.cookie.includes("zappy_refresh=refresh-two"), true);
  assert.equal(replay.headers.cookie.includes("refresh-three"), false);
  assert.equal(
    requestNamed(backend.requests, "wishlist-remove").headers.cookie,
    "zappy_cart=cart-2",
  );
});

test("the two session ids and the order id reach the scenarios that need them", async () => {
  const backend = createBackend();
  await runConformance({
    url: "http://localhost:5000/graphql",
    fetchImplementation: backend.fetchImplementation,
    write: () => {},
  });
  const sessions =
    backend.answers.get("login-second-device").data.login.customer.sessions;
  const currentSession = sessions.find((session) => session.current === true);
  const otherSession = sessions.find((session) => session.current === false);
  const orderId = backend.answers.get("order-place").data.placeOrder.order.id;
  assert.equal(currentSession.device, "phone");
  assert.equal(otherSession.device, "laptop");
  assert.equal(
    requestNamed(backend.requests, "revoke-session").variables.sessionId,
    otherSession.id,
  );
  const sessionLeft =
    backend.answers.get("revoke-session").data.revokeSession.sessions[0];
  assert.equal(sessionLeft.device, "phone");
  assert.equal(
    requestNamed(backend.requests, "revoke-session-signed-out").variables
      .sessionId,
    sessionLeft.id,
  );
  assert.equal(
    requestNamed(backend.requests, "order-by-id").variables.id,
    orderId,
  );
});

test("the first difference stops the run and names the path and both values", async () => {
  const backend = createBackend({
    answerFor: (scenario) => {
      if (scenario.name !== "promotion-apply-percentage") {
        return scenario.expected;
      }
      const wrong = structuredClone(scenario.expected);
      wrong.data.applyPromotionCode.cart.promotion.discount.amount = 238;
      return wrong;
    },
  });
  const lines = [];
  const result = await runConformance({
    url: "http://localhost:5000/graphql",
    fetchImplementation: backend.fetchImplementation,
    write: (line) => lines.push(line),
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.matched, 7);
  assert.equal(backend.requests.length, 9);
  const report = lines.join("\n");
  assert.match(
    report,
    /answer\.data\.applyPromotionCode\.cart\.promotion\.discount\.amount/,
  );
  assert.match(report, /expected 239/);
  assert.match(report, /answered 238/);
  assert.match(
    report,
    /promotion-apply-percentage differs from contract\/expected\/promotion-apply-percentage\.json/,
  );
});

test("a backend that never rotates the refresh cookie names the scenario", async () => {
  const backend = createBackend();
  const lines = [];
  const result = await runConformance({
    url: "http://localhost:5000/graphql",
    fetchImplementation: async (url, request) => {
      const response = await backend.fetchImplementation(url, request);
      return new Response(await response.text(), {
        status: response.status,
        headers: { "content-type": "application/json" },
      });
    },
    write: (line) => lines.push(line),
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.matched, 18);
  const report = lines.join("\n");
  assert.match(report, /refresh-session-replayed\s+could not run/);
  assert.match(report, /No earlier value of zappy_refresh to replay/);
});

test("a seed that does not load stops the run before the first scenario", async () => {
  const requests = [];
  const fetchImplementation = async (url, request) => {
    requests.push(JSON.parse(request.body));
    return new Response(
      JSON.stringify({
        data: { resetSeed: { success: true, loadedProducts: 12, errors: [] } },
      }),
      { status: 200, headers: { "content-type": "application/json" } },
    );
  };
  const lines = [];
  const result = await runConformance({
    url: "http://localhost:5000/graphql",
    fetchImplementation,
    write: (line) => lines.push(line),
  });
  assert.equal(result.exitCode, 1);
  assert.equal(result.matched, 0);
  assert.equal(requests.length, 1);
  assert.match(lines.join("\n"), /the seed did not load/);
  assert.match(lines.join("\n"), /expected 20/);
});

test("the command line takes a url and an optional origin", () => {
  assert.deepEqual(
    parseCommandLine(["--url", "http://localhost:5000/graphql"]),
    { url: "http://localhost:5000/graphql", origin: defaultOrigin },
  );
  assert.deepEqual(
    parseCommandLine([
      "--url",
      "http://localhost:5000/graphql",
      "--origin",
      "http://localhost:4200",
    ]),
    { url: "http://localhost:5000/graphql", origin: "http://localhost:4200" },
  );
});

test("a command line without a url says what it needs", () => {
  assert.throws(() => parseCommandLine([]), /The backend url is missing/);
  assert.throws(() => parseCommandLine(["--url"]), /--url needs a value/);
  assert.throws(
    () => parseCommandLine(["--backend", "http://localhost:5000/graphql"]),
    /--backend is not an argument this runner takes/,
  );
});
