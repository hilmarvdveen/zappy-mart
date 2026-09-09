import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  writeToApi: vi.fn(),
  revalidateStorefront: vi.fn(),
  storeAccessToken: vi.fn(),
  clearSession: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("@/server/storefrontClient", () => ({
  writeToApi: mocked.writeToApi,
  readFromApi: vi.fn(),
}));

vi.mock("@/server/revalidation", () => ({
  revalidateStorefront: mocked.revalidateStorefront,
}));

vi.mock("@/server/session", () => ({
  storeAccessToken: mocked.storeAccessToken,
  clearSession: mocked.clearSession,
}));

vi.mock("next/navigation", () => ({
  redirect: mocked.redirect,
}));

import {
  register,
  revokeSession,
  signIn,
  signOut,
} from "@/server/actions/accountActions";
import { untouchedAction } from "@/server/actionState";

function formWith(fields: Record<string, string>): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) {
    form.set(name, value);
  }
  return form;
}

describe("signing in", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("normalises the address, keeps the access token and reports success", async () => {
    mocked.writeToApi.mockResolvedValue({
      login: {
        accessToken: "a-json-web-token",
        accessTokenExpiresAt: "2026-09-09T12:15:00Z",
        customer: {
          id: "customer-01",
          name: "Jane Doe",
          email: "jane@example.com",
        },
        errors: [],
      },
    });

    await signIn(
      untouchedAction,
      formWith({
        email: "  Jane@Example.com ",
        password: "correct horse battery staple",
        device: "Chrome on Windows",
        destination: "/checkout",
      }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      input: {
        email: "jane@example.com",
        password: "correct horse battery staple",
        device: "Chrome on Windows",
      },
    });
    expect(mocked.storeAccessToken).toHaveBeenCalledWith(
      "a-json-web-token",
      "2026-09-09T12:15:00Z",
    );
    expect(mocked.redirect).toHaveBeenCalledWith("/checkout");
  });

  it("hands back wrong credentials as a refusal and keeps no token", async () => {
    mocked.writeToApi.mockResolvedValue({
      login: {
        accessToken: null,
        accessTokenExpiresAt: null,
        customer: null,
        errors: [
          {
            code: "CREDENTIALS_INVALID",
            message: "No match.",
            field: null,
          },
        ],
      },
    });

    const state = await signIn(
      untouchedAction,
      formWith({ email: "jane@example.com", password: "wrong", device: "" }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("CREDENTIALS_INVALID");
    expect(mocked.storeAccessToken).not.toHaveBeenCalled();
  });
});

describe("registering", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("signs the new customer in straight away", async () => {
    mocked.writeToApi.mockResolvedValue({
      register: {
        accessToken: "a-json-web-token",
        accessTokenExpiresAt: "2026-09-09T12:15:00Z",
        customer: { id: "customer-02", name: "Sam", email: "sam@example.com" },
        errors: [],
      },
    });

    await register(
      untouchedAction,
      formWith({
        email: "Sam@Example.com",
        name: " Sam ",
        password: "a long enough password",
      }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      input: {
        email: "sam@example.com",
        name: "Sam",
        password: "a long enough password",
      },
    });
    expect(mocked.redirect).toHaveBeenCalledWith("/account");
  });

  it("hands back a taken address as a refusal", async () => {
    mocked.writeToApi.mockResolvedValue({
      register: {
        accessToken: null,
        accessTokenExpiresAt: null,
        customer: null,
        errors: [
          {
            code: "EMAIL_TAKEN",
            message: "Already known.",
            field: "input.email",
          },
        ],
      },
    });

    const state = await register(
      untouchedAction,
      formWith({
        email: "jane@example.com",
        name: "Jane",
        password: "a long enough password",
      }),
    );

    expect(state.outcome).toBe("refused");
    expect(state.errors[0].code).toBe("EMAIL_TAKEN");
  });
});

describe("signing out", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("revokes the session, throws the cookie away and goes to the catalogue", async () => {
    mocked.writeToApi.mockResolvedValue({
      logout: { success: true, errors: [] },
    });

    await signOut();

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {});
    expect(mocked.clearSession).toHaveBeenCalledOnce();
    expect(mocked.redirect).toHaveBeenCalledWith("/");
  });
});

describe("revoking one session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends the session id", async () => {
    mocked.writeToApi.mockResolvedValue({
      revokeSession: { sessions: [], errors: [] },
    });

    const state = await revokeSession(
      untouchedAction,
      formWith({ sessionId: "session-2" }),
    );

    expect(mocked.writeToApi).toHaveBeenCalledWith(expect.anything(), {
      sessionId: "session-2",
    });
    expect(state.outcome).toBe("succeeded");
  });
});
