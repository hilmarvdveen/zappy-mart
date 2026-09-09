import { readFileSync } from "node:fs";
import { contractPath } from "./repositoryRoot.js";
import type { Money } from "../domain/money.js";

export type SeedCategory = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
};

export type SeedProduct = {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly description: string;
  readonly price: Money;
  readonly categorySlug: string;
  readonly stock: number;
  readonly imageUrl: string | null;
};

export type SeedPromotionCode = {
  readonly code: string;
  readonly kind: "PERCENTAGE" | "FIXED_AMOUNT" | "FREE_SHIPPING";
  readonly percentage: number | null;
  readonly amount: Money | null;
  readonly minimumSubtotal: Money | null;
  readonly validFrom: string;
  readonly validUntil: string;
  readonly usageLimit: number | null;
  readonly timesUsed: number;
};

export type SeedCustomer = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly password: string;
  readonly createdAt: string;
  readonly wishlist: readonly string[];
};

export function readSeedCategories(): readonly SeedCategory[] {
  return readSeedFile<SeedCategory>("categories.json");
}

export function readSeedProducts(): readonly SeedProduct[] {
  return readSeedFile<SeedProduct>("products.json");
}

export function readSeedPromotionCodes(): readonly SeedPromotionCode[] {
  return readSeedFile<SeedPromotionCode>("promotion-codes.json");
}

export function readSeedCustomers(): readonly SeedCustomer[] {
  return readSeedFile<SeedCustomer>("customers.json");
}

function readSeedFile<Row>(fileName: string): readonly Row[] {
  return JSON.parse(readFileSync(contractPath("seed", fileName), "utf8")) as Row[];
}
