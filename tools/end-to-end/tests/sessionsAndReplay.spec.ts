import { expect, test, type BrowserContext, type Cookie } from "@playwright/test";
import {
  expectSessionEndedNotice,
  logIn,
  logOut,
  otherDeviceEntry,
  register,
  sessionsPanel,
  unusedEmailAddress,
} from "../storeFront";

const password = "correct horse battery staple";

async function storeFrontCookie(context: BrowserContext): Promise<Cookie> {
  const cookies = await context.cookies();
  const found = cookies.find((cookie) => cookie.name === "zappy_store_front");
  if (found === undefined) {
    throw new Error(
      "The store front did not set its session cookie, so there is nothing to replay.",
    );
  }
  return found;
}

test("a customer registers, logs in twice, revokes the other session and cannot replay a dead one", async ({
  browser,
}) => {
  const customer = {
    name: "Sam Rider",
    email: unusedEmailAddress(),
    password,
  };

  const firstContext = await browser.newContext();
  const firstPage = await firstContext.newPage();
  await register(firstPage, customer);
  await expect(
    firstPage.getByRole("heading", { level: 1, name: "Your account" }),
  ).toBeVisible();
  await expect(sessionsPanel(firstPage).getByRole("listitem")).toHaveCount(1);

  await logOut(firstPage);
  await firstPage.goto("/login");
  await logIn(firstPage, customer);
  await expect(
    firstPage.getByRole("heading", { level: 1, name: "Your account" }),
  ).toBeVisible();

  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  await secondPage.goto("/login");
  await logIn(secondPage, customer);
  await expect(
    secondPage.getByRole("heading", { level: 1, name: "Your account" }),
  ).toBeVisible();

  await firstPage.reload();
  await expect(sessionsPanel(firstPage).getByRole("listitem")).toHaveCount(2);

  await otherDeviceEntry(firstPage).getByRole("button").click();
  await expect(sessionsPanel(firstPage).getByRole("listitem")).toHaveCount(1);

  await secondPage.goto("/account");
  await expectSessionEndedNotice(secondPage);

  const liveCookie = await storeFrontCookie(firstContext);
  await logOut(firstPage);
  await firstContext.addCookies([liveCookie]);
  await firstPage.goto("/account");
  await expectSessionEndedNotice(firstPage);

  await firstContext.close();
  await secondContext.close();
});
