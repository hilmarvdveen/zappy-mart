import { expect, test } from "vitest";
import {
  decryptSession,
  emptyStoreFrontSession,
  encryptSession,
  readStoreFrontSession,
  writeStoreFrontSession,
} from "./sessionCookie.server";

const session = {
  ...emptyStoreFrontSession,
  accessToken: "access-token-01",
  refreshCookie: "refresh-token-01",
  customerName: "Jane Doe",
};

test("a session survives the trip through the cookie", async () => {
  const setCookie = await writeStoreFrontSession(session);
  const request = new Request("http://localhost:5173/", {
    headers: { Cookie: setCookie.split(";")[0] ?? "" },
  });

  expect(await readStoreFrontSession(request)).toEqual(session);
});

test("the cookie carries no token in the clear", async () => {
  const setCookie = await writeStoreFrontSession(session);

  expect(setCookie).not.toContain("access-token-01");
  expect(setCookie).not.toContain("refresh-token-01");
  expect(setCookie).not.toContain("Jane Doe");
});

test("the cookie is closed to scripts and stays on this site", async () => {
  const setCookie = await writeStoreFrontSession(session);

  expect(setCookie).toContain("HttpOnly");
  expect(setCookie).toContain("SameSite=Lax");
});

test("a session that was tampered with reads as no session at all", () => {
  const encrypted = encryptSession(session);
  const tampered = `${encrypted.slice(0, -4)}AAAA`;

  expect(decryptSession(tampered)).toEqual(emptyStoreFrontSession);
});

test("a request without the cookie reads as no session at all", async () => {
  const request = new Request("http://localhost:5173/");

  expect(await readStoreFrontSession(request)).toEqual(emptyStoreFrontSession);
});
