import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";

const seedDirectory = new URL("../../contract/seed/", import.meta.url);

export const storeCurrency = "EUR";

export function money(amount) {
  return { amount, currency: storeCurrency };
}

export function formatMoment(moment) {
  return `${moment.toISOString().slice(0, 19)}Z`;
}

export function userError(code, message, field = null) {
  return { code, message, field };
}

function readSeedFile(fileName) {
  return JSON.parse(readFileSync(new URL(fileName, seedDirectory), "utf8"));
}

export function createStore() {
  return {
    accessTokenSecret: randomBytes(32),
    categories: [],
    products: [],
    promotionCodes: [],
    customers: [],
    carts: [],
    anonymousWishlists: [],
    sessions: [],
    refreshTokens: [],
    orders: [],
    orderNumberSequence: 0
  };
}

export async function loadSeed(store, hashPassword) {
  store.categories = readSeedFile("categories.json");
  store.products = readSeedFile("products.json");
  store.promotionCodes = readSeedFile("promotion-codes.json").map((promotionCode) => ({
    ...promotionCode,
    validFrom: new Date(promotionCode.validFrom),
    validUntil: new Date(promotionCode.validUntil)
  }));

  store.customers = [];
  for (const seededCustomer of readSeedFile("customers.json")) {
    store.customers.push({
      id: seededCustomer.id,
      email: seededCustomer.email.toLowerCase(),
      name: seededCustomer.name,
      passwordHash: await hashPassword(seededCustomer.password),
      createdAt: new Date(seededCustomer.createdAt),
      wishlistProductIds: [...seededCustomer.wishlist]
    });
  }

  store.carts = [];
  store.anonymousWishlists = [];
  store.sessions = [];
  store.refreshTokens = [];
  store.orders = [];
  store.orderNumberSequence = 0;

  return store.products.length;
}
