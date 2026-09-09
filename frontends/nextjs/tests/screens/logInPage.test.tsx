import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/accountActions", () => ({
  signIn: vi.fn(),
}));

import LogInPage from "@/app/login/page";

import { signedInCustomer } from "../support/seedFixtures";

function renderLogInPage(
  parameters: Record<string, string | string[] | undefined>,
) {
  return LogInPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(parameters),
  });
}

describe("the log in screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for the address, the password and the device", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderLogInPage({}));

    expect(
      screen.getByRole("heading", { level: 1, name: "Log in" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Device description" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log in" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("says the session ended when a dead session sent the visitor here", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderLogInPage({ sessionEnded: "true" }));

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your session has ended. Please log in again.",
    );
  });

  it("carries the screen the visitor came from into the form", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderLogInPage({ next: "/checkout" }));

    const form = screen.getByRole("button", { name: "Log in" }).closest("form");
    expect(form?.querySelector('input[name="destination"]')).toHaveValue(
      "/checkout",
    );
  });

  it("sends a visitor who is already logged in to the account screen", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({
      me: {
        id: signedInCustomer.id,
        name: signedInCustomer.name,
        email: signedInCustomer.email,
      },
      wishlist: [],
    });

    render(await renderLogInPage({}));

    expect(
      screen.getByRole("link", { name: "Go to your account" }),
    ).toHaveAttribute("href", "/account");
  });
});
