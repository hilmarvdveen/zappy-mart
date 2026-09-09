import { render, screen } from "@testing-library/react";
import { createRoutesStub } from "react-router";
import { expect, test } from "vitest";
import { SiteHeader } from "./SiteHeader";

function renderHeader(properties: {
  cartQuantity: number;
  customerName: string | null;
  wishlistCount: number;
}) {
  const Stub = createRoutesStub([
    {
      path: "/",
      Component: () => <SiteHeader {...properties} />,
    },
  ]);
  render(<Stub initialEntries={["/"]} />);
}

test("the header counts the cart and offers a way in", async () => {
  renderHeader({ cartQuantity: 3, customerName: null, wishlistCount: 0 });

  expect(
    await screen.findByRole("link", { name: "Cart, 3 items" }),
  ).toHaveAttribute("href", "/cart");
  expect(screen.getByRole("link", { name: "Log in" })).toHaveAttribute(
    "href",
    "/login",
  );
});

test("the header counts the wishlist the store keeps for this visitor", async () => {
  renderHeader({ cartQuantity: 0, customerName: null, wishlistCount: 2 });

  expect(
    await screen.findByRole("link", { name: "Wishlist, 2 saved" }),
  ).toHaveAttribute("href", "/wishlist");
});

test("the header names the customer and offers a way out once signed in", async () => {
  renderHeader({
    cartQuantity: 1,
    customerName: "Jane Doe",
    wishlistCount: 4,
  });

  expect(await screen.findByRole("link", { name: "Jane Doe" })).toHaveAttribute(
    "href",
    "/account",
  );
  expect(screen.getByRole("button", { name: "Log out" })).toBeVisible();
  expect(screen.getByRole("link", { name: "Cart, 1 item" })).toBeVisible();
});
