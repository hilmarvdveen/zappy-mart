import { expect, type Page } from "@playwright/test";

export const seedCustomer = {
  email: "jane@example.com",
  password: "correct horse battery staple",
  name: "Jane Doe",
};

export const orderedProduct = {
  name: "MBJ Women's Solid Short Sleeve Boat Neck V",
  slug: "mbj-womens-solid-short-sleeve-boat-neck-v",
  price: "€9.85",
};

export const promotionCode = "WELCOME10";

export function unusedEmailAddress(): string {
  return `visitor-${Date.now()}-${Math.floor(Math.random() * 100000)}@example.com`;
}

export async function openCatalogue(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1, name: "Catalogue" })).toBeVisible();
}

export async function filterCatalogue(
  page: Page,
  options: { categoryName: string; searchTerm: string },
): Promise<void> {
  await page.getByRole("searchbox", { name: "Search by name" }).fill(options.searchTerm);
  await page
    .getByRole("combobox", { name: "Category" })
    .selectOption({ label: options.categoryName });
  await page.getByRole("button", { name: "Filter" }).click();
}

export async function openProduct(page: Page, name: string): Promise<void> {
  await page.getByRole("link", { name, exact: true }).click();
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible();
}

export async function addToCart(page: Page, quantity: number): Promise<void> {
  await page.getByRole("spinbutton", { name: "Quantity" }).fill(String(quantity));
  await page.getByRole("button", { name: "Add to cart" }).click();
  await expect(page.getByRole("status")).toHaveText("Added to your cart.");
}

export async function logIn(
  page: Page,
  credentials: { email: string; password: string },
): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Log in" })).toBeVisible();
  await page.getByRole("textbox", { name: "Email address" }).fill(credentials.email);
  await page.getByLabel("Password", { exact: true }).fill(credentials.password);
  await page.getByRole("button", { name: "Log in" }).click();
}

export async function register(
  page: Page,
  customer: { name: string; email: string; password: string },
): Promise<void> {
  await page.goto("/register");
  await page.getByRole("textbox", { name: "Name" }).fill(customer.name);
  await page.getByRole("textbox", { name: "Email address" }).fill(customer.email);
  await page.getByLabel("Password", { exact: true }).fill(customer.password);
  await page.getByRole("button", { name: "Register" }).click();
}

export async function logOut(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page.getByRole("link", { name: "Log in" })).toBeVisible();
}

export function sessionsPanel(page: Page) {
  return page.getByRole("region", { name: "Open sessions" });
}

export function otherDeviceEntry(page: Page) {
  return sessionsPanel(page)
    .getByRole("listitem")
    .filter({ hasNotText: "(this device)" });
}

export async function expectSessionEndedNotice(page: Page): Promise<void> {
  await expect(page.getByRole("heading", { level: 1, name: "Log in" })).toBeVisible();
  await expect(page.getByRole("alert")).toContainText(
    "Your session has ended. Please log in again.",
  );
}
