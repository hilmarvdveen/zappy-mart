import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./account";
import {
  otherDeviceSession,
  placedOrder,
  thisDeviceSession,
} from "~/testing/fixtures";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

const accountAnswer = {
  me: {
    id: "customer-01",
    name: "Jane Doe",
    email: "jane@example.com",
    createdAt: "2026-01-15T09:00:00Z",
    sessions: [thisDeviceSession, otherDeviceSession],
  },
  orders: { totalCount: 1, edges: [{ node: placedOrder }] },
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("the loader sends a visitor who is not signed in to the login screen", async () => {
  const connection = await openConnectionForTest();

  await expect(
    loader(
      routeArgumentsFor(connection, new Request(`${storeFrontAddress}/account`)),
    ),
  ).rejects.toMatchObject({ status: 302 });
});

test("the loader reads the customer, the sessions and a page of orders", async () => {
  vi.mocked(callStore).mockResolvedValue(answerWith(accountAnswer));
  const connection = await openConnectionForTest({ signedIn: true });

  const loaded = await loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/account`)),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({ first: 10 });
  expect(loaded.customer.sessions).toHaveLength(2);
  expect(loaded.orders).toHaveLength(1);
  expect(loaded.orderCount).toBe(1);
});

test("the action revokes another session and keeps this one", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      revokeSession: { sessions: [thisDeviceSession], errors: [] },
    }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/account", {
        intent: "revokeSession",
        sessionId: "session-02",
      }),
    ),
  );

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    sessionId: "session-02",
  });
  expect(outcome.problems).toEqual([]);
  expect(connection.signedIn).toBe(true);
});

test("the action ends this session when the revoked one was this device", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      revokeSession: { sessions: [otherDeviceSession], errors: [] },
    }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/account", {
        intent: "revokeSession",
        sessionId: "session-01",
      }),
    ),
  ).catch((redirected: unknown) => redirected);

  expect(outcome).toMatchObject({ status: 302 });
  expect((outcome as Response).headers.get("Location")).toBe(
    "/login?reason=session-ended",
  );
  expect(connection.signedIn).toBe(false);
});

test("the action explains a session the store could not find", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      revokeSession: {
        sessions: [thisDeviceSession],
        errors: [
          {
            code: "SESSION_NOT_FOUND",
            message: "Gone already.",
            field: null,
          },
        ],
      },
    }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(
      connection,
      formRequest("/account", {
        intent: "revokeSession",
        sessionId: "session-99",
      }),
    ),
  );

  expect(outcome.problems).toEqual(["That session is already closed."]);
});
