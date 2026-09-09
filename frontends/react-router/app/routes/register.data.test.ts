import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./register";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader keeps the return address for after the registration", async () => {
  const connection = await openConnectionForTest();

  const loaded = await loader(
    routeArgumentsFor(
      connection,
      new Request(`${storeFrontAddress}/register?returnTo=%2Fcart`),
    ),
  );

  expect(loaded.returnTo).toBe("/cart");
});

test("the action registers the customer and signs them in at once", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      register: {
        customer: { id: "customer-02", name: "Sam Rider" },
        accessToken: "access-token-02",
        accessTokenExpiresAt: new Date(Date.now() + 900_000).toISOString(),
        errors: [],
      },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/register", {
        name: " Sam Rider ",
        email: " sam@example.com ",
        password: "a long enough password",
        returnTo: "/cart",
      }),
    ),
  ).catch((redirected: unknown) => redirected);

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toMatchObject({
    input: { email: "sam@example.com", name: "Sam Rider" },
  });
  expect((outcome as Response).headers.get("Location")).toBe("/cart");
  expect(connection.customerName).toBe("Sam Rider");
});

test("the action explains an email address the store already has", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      register: {
        customer: null,
        accessToken: null,
        accessTokenExpiresAt: null,
        errors: [
          { code: "EMAIL_TAKEN", message: "Already here.", field: "input.email" },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest();

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/register", {
        name: "Jane Doe",
        email: "jane@example.com",
        password: "a long enough password",
        returnTo: "/account",
      }),
    ),
  );

  expect(outcome.problems).toEqual([
    "An account with that email address already exists.",
  ]);
});
