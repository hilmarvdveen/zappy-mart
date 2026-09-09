import { beforeEach, expect, test, vi } from "vitest";

vi.mock("~/graphql/client.server", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("~/graphql/client.server")>();
  return { ...original, callStore: vi.fn() };
});

import { callStore } from "~/graphql/client.server";
import { loader } from "./catalogue";
import { cottonJacket, mensClothing } from "~/testing/fixtures";
import {
  answerWith,
  openConnectionForTest,
  routeArgumentsFor,
  storeFrontAddress,
} from "~/testing/storeTestSupport";

const catalogueAnswer = {
  categories: [mensClothing],
  products: {
    totalCount: 1,
    pageInfo: { hasNextPage: true, endCursor: "cursor-12" },
    edges: [{ cursor: "cursor-03", node: cottonJacket }],
  },
};

beforeEach(() => {
  vi.mocked(callStore).mockReset();
  vi.mocked(callStore).mockResolvedValue(answerWith(catalogueAnswer));
});

async function loadCatalogue(query: string) {
  const connection = await openConnectionForTest();
  return loader(
    routeArgumentsFor(connection, new Request(`${storeFrontAddress}/${query}`)),
  );
}

test("the loader asks for the whole catalogue when the URL carries no filter", async () => {
  await loadCatalogue("");

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    filter: null,
    first: 12,
    after: null,
  });
});

test("the loader turns the category, the search term and the stock switch into a filter", async () => {
  await loadCatalogue("?category=mens-clothing&search=jacket&inStock=true");

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toEqual({
    filter: {
      categorySlug: "mens-clothing",
      nameContains: "jacket",
      inStockOnly: true,
    },
    first: 12,
    after: null,
  });
});

test("the loader passes the cursor of the previous page on", async () => {
  await loadCatalogue("?after=cursor-03");

  expect(vi.mocked(callStore).mock.calls[0]?.[1]).toMatchObject({
    after: "cursor-03",
  });
});

test("the loader hands the screen the products, the count and the next cursor", async () => {
  const loaded = await loadCatalogue("");

  expect(loaded.products).toEqual([cottonJacket]);
  expect(loaded.categories).toEqual([mensClothing]);
  expect(loaded.totalCount).toBe(1);
  expect(loaded.nextCursor).toBe("cursor-12");
});

test("the loader answers no next cursor when the page is the last one", async () => {
  vi.mocked(callStore).mockResolvedValue(
    answerWith({
      ...catalogueAnswer,
      products: {
        ...catalogueAnswer.products,
        pageInfo: { hasNextPage: false, endCursor: "cursor-12" },
      },
    }),
  );

  const loaded = await loadCatalogue("");

  expect(loaded.nextCursor).toBeNull();
});
