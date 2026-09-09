import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocked = vi.hoisted(() => ({
  readSignedInCustomer: vi.fn(),
}));

vi.mock("@/server/account", () => ({
  readSignedInCustomer: mocked.readSignedInCustomer,
}));

vi.mock("@/server/actions/accountActions", () => ({
  register: vi.fn(),
}));

import RegisterPage from "@/app/register/page";

import { signedInCustomer } from "../support/seedFixtures";

function renderRegisterPage(
  parameters: Record<string, string | string[] | undefined>,
) {
  return RegisterPage({
    params: Promise.resolve({}),
    searchParams: Promise.resolve(parameters),
  });
}

describe("the register screen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("asks for a name, an address and a password", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({ me: null, wishlist: [] });

    render(await renderRegisterPage({}));

    expect(
      screen.getByRole("heading", { level: 1, name: "Register" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toBeInTheDocument();
    expect(
      screen.getByRole("textbox", { name: "Email address" }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Register" })).toBeInTheDocument();
  });

  it("points a customer who already has an account at their account", async () => {
    mocked.readSignedInCustomer.mockResolvedValue({
      me: {
        id: signedInCustomer.id,
        name: signedInCustomer.name,
        email: signedInCustomer.email,
      },
      wishlist: [],
    });

    render(await renderRegisterPage({}));

    expect(
      screen.getByRole("link", { name: "Go to your account" }),
    ).toHaveAttribute("href", "/account");
  });
});
