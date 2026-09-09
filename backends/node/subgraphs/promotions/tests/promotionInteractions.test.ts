import { after, before, beforeEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import type { Database, HandledEventStore } from "@zappy/shared";
import {
  createHandledEventTable,
  money,
  openInMemoryDatabase,
  sqlHandledEventStore,
  systemClock
} from "@zappy/shared";
import { createPromotionTables } from "../src/adapters/persistence/promotionTables.js";
import {
  sqlAppliedPromotionStore,
  sqlPromotionCodeRepository
} from "../src/adapters/persistence/sqlPromotionRepository.js";
import { managePromotions, type ManagePromotions } from "../src/application/applyPromotionCode.js";
import {
  promotionInteractions,
  promotionUseConsumerName,
  type PromotionInteractions
} from "../src/application/promotionInteractions.js";
import { resetPromotionSeed } from "../src/application/resetSeed.js";
import type { PromotionCodeRepository } from "../src/application/ports.js";

let database: Database;
let codes: PromotionCodeRepository;
let promotions: ManagePromotions;
let handledEvents: HandledEventStore;
let interactions: PromotionInteractions;

async function timesUsed(code: string): Promise<number> {
  return (await codes.readByCode(code))?.timesUsed ?? -1;
}

before(async () => {
  database = openInMemoryDatabase();
  await createPromotionTables(database);
  await createHandledEventTable(database);
});

beforeEach(async () => {
  codes = sqlPromotionCodeRepository(database);
  const applied = sqlAppliedPromotionStore(database);
  handledEvents = sqlHandledEventStore(database, () => systemClock.now());
  await resetPromotionSeed(codes, applied, handledEvents)();
  promotions = managePromotions(codes, applied, () => systemClock.now());
  interactions = promotionInteractions(promotions, handledEvents);
});

after(async () => {
  await database.close();
});

describe("promotion validation, the request driven side", () => {
  it("answers the verdict to the caller that is waiting for it", async () => {
    const outcome = await interactions.validateOnRequest("cart-01", money(1970), "welcome10");
    assert.deepEqual(outcome, { kind: "applied", cartId: "cart-01" });
  });

  it("answers the reason a code is refused, in the same call", async () => {
    const outcome = await interactions.validateOnRequest("cart-01", money(1970), "SUMMER2025");
    assert.equal(outcome.kind, "refused");
    assert.equal(outcome.kind === "refused" ? outcome.errors[0]?.code : "none", "CODE_EXPIRED");
  });

  it("does not count a use, because validating is not using", async () => {
    const before = await timesUsed("WELCOME10");
    await interactions.validateOnRequest("cart-01", money(1970), "welcome10");
    assert.equal(await timesUsed("WELCOME10"), before);
  });
});

describe("counting a use, the event driven side", () => {
  it("counts one use for the event it has not seen", async () => {
    const before = await timesUsed("WELCOME10");
    assert.equal(await interactions.countUseOnEvent("outbox-01", "welcome10"), true);
    assert.equal(await timesUsed("WELCOME10"), before + 1);
  });

  it("counts nothing more for the same event id, because delivery is at least once", async () => {
    const before = await timesUsed("WELCOME10");
    await interactions.countUseOnEvent("outbox-02", "welcome10");
    await interactions.countUseOnEvent("outbox-02", "welcome10");
    await interactions.countUseOnEvent("outbox-02", "welcome10");
    assert.equal(await timesUsed("WELCOME10"), before + 1);
    assert.equal(await handledEvents.hasHandled("outbox-02", promotionUseConsumerName), true);
  });

  it("counts a second use for a second event id", async () => {
    const before = await timesUsed("WELCOME10");
    await interactions.countUseOnEvent("outbox-03", "welcome10");
    await interactions.countUseOnEvent("outbox-04", "welcome10");
    assert.equal(await timesUsed("WELCOME10"), before + 2);
  });

  it("answers false for a code nobody has, and does not fail the delivery over it", async () => {
    assert.equal(await interactions.countUseOnEvent("outbox-05", "NOSUCHCODE"), false);
  });

  it("answers true for a repeat, because the outcome the publisher wanted is the outcome it has", async () => {
    await interactions.countUseOnEvent("outbox-06", "NOSUCHCODE");
    assert.equal(await interactions.countUseOnEvent("outbox-06", "NOSUCHCODE"), true);
  });
});
