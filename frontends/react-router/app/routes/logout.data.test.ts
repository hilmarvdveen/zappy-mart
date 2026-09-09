import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { action, loader } from "./logout";
import {
  answerWith,
  formRequest,
  openConnectionForTest,
  routeArgumentsFor,
} from "~/testing/storeTestSupport";

beforeEach(() => {
  vi.mocked(callStore).mockReset();
});

test("visiting the logout address in the browser leads back to the catalogue", async () => {
  const outcome = await loader();

  expect(outcome.status).toBe(302);
  expect(outcome.headers.get("Location")).toBe("/");
});

test("the action tells the store to close the session and forgets the tokens", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({ logout: { success: true } }),
  );
  const connection = await openConnectionForTest({ signedIn: true });

  const outcome = await action(
    routeArgumentsFor(connection, formRequest("/logout", {})),
  );

  expect(vi.mocked(callStore)).toHaveBeenCalledTimes(1);
  expect(outcome.headers.get("Location")).toBe("/");
  expect(connection.signedIn).toBe(false);
  const headers = await connection.headers();
  expect(headers.get("Set-Cookie")).toContain("Max-Age=0");
});

test("the action leaves the store alone when nobody is signed in", async () => {
  const connection = await openConnectionForTest();

  await action(routeArgumentsFor(connection, formRequest("/logout", {})));

  expect(vi.mocked(callStore)).not.toHaveBeenCalled();
});
