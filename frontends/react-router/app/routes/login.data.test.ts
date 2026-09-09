import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./login";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

const signedInAnswer = {
  login: {
    customer: { id: "customer-01", name: "Jane Doe" },
    accessToken: "access-token-01",
    accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
    errors: [],
  },
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader keeps a safe return address and reports an ended session", async () => {
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(
        `${storeFrontAddress}/login?returnTo=%2Fcheckout&reason=session-ended`,
      ),
    ),
  );

  expect(loaded.returnTo).toBe("/checkout");
  expect(loaded.sessionEnded).toBe(true);
});

test("the loader refuses a return address that leaves this store", async () => {
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(
        `${storeFrontAddress}/login?returnTo=https%3A%2F%2Felsewhere.example`,
      ),
    ),
  );

  expect(loaded.returnTo).toBe("/account");
});

test("the loader sends a customer who is already signed in onwards", async () => {
  const connection = await openConnectionForTest({ signedIn: true });

  await expect(
    loader(
      routeArgumentsFor(connection, new Request(`${storeFrontAddress}/login`)),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the action logs the customer in and follows the return address", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(signedInAnswer));
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/login", {
        email: " jane@example.com ",
        password: "correct horse battery staple",
        returnTo: "/checkout",
      }),
    ),
  ).catch((redirected: unknown) => redirected);

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toMatchObject({
    input: {
      email: "jane@example.com",
      password: "correct horse battery staple",
    },
  });
  expect((outcome as Response).headers.get("Location")).toBe("/checkout");
  expect(connection.signedIn).toBe(true);
  expect(connection.customerName).toBe("Jane Doe");
});

test("the action explains a refused login and stays on the screen", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      login: {
        customer: null,
        accessToken: null,
        accessTokenExpiresAt: null,
        errors: [
          {
            code: "CREDENTIALS_INVALID",
            message: "No match.",
            field: null,
          },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/login", {
        email: "jane@example.com",
        password: "wrong password here",
        returnTo: "/account",
      }),
    ),
  );

  expect(outcome.problems).toEqual([
    "That email address and password do not match.",
  ]);
  expect(connection.signedIn).toBe(false);
});
