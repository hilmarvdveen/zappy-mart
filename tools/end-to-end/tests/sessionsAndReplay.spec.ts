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

async function cookiesOfTheSignedInBrowser(context: BrowserContext): Promise<Cookie[]> {
  const cookies = await context.cookies();
  if (cookies.length === 0) {
    throw new Error(
      "The store front set no cookie while signed in, so there is nothing to replay.",
    );
  }
  return cookies;
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

  const cookiesBeforeLogout = await cookiesOfTheSignedInBrowser(firstContext);
  await logOut(firstPage);
  await firstContext.addCookies(cookiesBeforeLogout);
  await firstPage.goto("/account");
  await expectSessionEndedNotice(firstPage);

  await firstContext.close();
  await secondContext.close();
});
