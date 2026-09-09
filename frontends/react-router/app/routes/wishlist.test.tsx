import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import Wishlist from "./wishlist";
import { cottonJacket } from "~/testing/fixtures";

function renderWishlist(options: {
  signedIn: boolean;
  products: typeof cottonJacket[];
}) {
  const Stub = createRoutesStub([
    {
      path: "/wishlist",
      Component: Wishlist,
      loader: () => options,
      action: () => ({ problems: [] }),
    },
  ]);
  render(<Stub initialEntries={["/wishlist"]} />);
}

test("an empty wishlist points back at the catalogue", async () => {
  renderWishlist({ signedIn: false, products: [] });

  expect(
    await screen.findByRole("heading", { level: 1, name: "Wishlist" }),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: "Find something in the catalogue" }),
  ).toHaveAttribute("href", "/");
});

test("an anonymous wishlist says the list lives in this browser", async () => {
  renderWishlist({ signedIn: false, products: [cottonJacket] });

  expect(
    await screen.findByText(
      "Your wishlist travels with this browser. It moves to your account when you log in.",
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("button", { name: "Remove Mens Cotton Jacket" }),
  ).toBeVisible();
});

test("a signed in wishlist says the list lives on the account", async () => {
  renderWishlist({ signedIn: true, products: [cottonJacket] });

  expect(
    await screen.findByText(
      "Your wishlist lives on your account and follows you to every browser.",
    ),
  ).toBeVisible();
  expect(
    screen.getByRole("link", { name: cottonJacket.name }),
  ).toHaveAttribute("href", `/products/${cottonJacket.slug}`);
});
