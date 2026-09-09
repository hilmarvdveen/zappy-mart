import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/accountActions", () => ({
  signIn: vi.fn(),
  register: vi.fn(),
}));

import SignInPage from "@/app/sign-in/page";

import { signedInCustomer } from "../support/seedFixtures";

function renderSignInPage(
  parameters: Record<string, string | string[] | undefined>,
) {
  return SignInPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(parameters),
  });
}

describe("the sign in screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("offers both an existing account and a new one", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderSignInPage({}));

    expect(
      screen.getByRole("heading", { level: 1, name: "Sign in" }),
    ).toBeInTheDocument();

    const existingAccount = within(
      screen.getByRole("region", { name: "With an account" }),
    );
    expect(
      existingAccount.getByRole("textbox", { name: "Email address" }),
    ).toBeInTheDocument();
    expect(
      existingAccount.getByRole("textbox", { name: "Device description" }),
    ).toBeInTheDocument();
    expect(
      existingAccount.getByRole("button", { name: "Sign in" }),
    ).toBeInTheDocument();

    const newAccount = within(screen.getByRole("region", { name: "New here" }));
    expect(newAccount.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(
      newAccount.getByRole("button", { name: "Create account" }),
    ).toBeInTheDocument();
  });

  it("carries the screen the visitor came from into the form", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderSignInPage({ next: "/checkout" }));

    const existingAccount = screen.getByRole("region", {
      name: "With an account",
    });
    expect(
      existingAccount.querySelector('input[name="destination"]'),
    ).toHaveValue("/checkout");
  });

  it("sends a visitor who is already signed in to the account screen", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({
      me: {
        id: signedInCustomer.id,
        name: signedInCustomer.name,
        email: signedInCustomer.email,
      },
      wishlist: [],
    });

    render(await renderSignInPage({}));

    expect(
      screen.getByRole("link", { name: "Go to your account" }),
    ).toHaveAttribute("href", "/account");
  });
});
