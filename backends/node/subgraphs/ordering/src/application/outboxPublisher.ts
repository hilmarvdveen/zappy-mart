import { backoffDelayInMilliseconds, defaultBackoffSettings, type BackoffSettings } from "@zappy/shared";
import type { OrderPlaced } from "../domain/orderPlaced.js";
import type { OrderPlacedConsumers, OutboxRow, OutboxStore } from "./ports.js";

export type OutboxPass = {
  readonly published: number;
  readonly retried: number;
  readonly deadLettered: number;
};

export type OutboxNudge = {
  publishDue(): Promise<OutboxPass>;
};

export type OutboxPublisher = OutboxNudge & {
  startPolling(): void;
  stopPolling(): void;
};

export type OutboxPublisherSettings = {
  readonly attemptBudget: number;
  readonly pollingIntervalInMilliseconds: number;
  readonly backoff: BackoffSettings;
};

export const defaultOutboxPublisherSettings: OutboxPublisherSettings = {
  attemptBudget: 5,
  pollingIntervalInMilliseconds: 2000,
  backoff: defaultBackoffSettings
};

export function outboxPublisher(
  outbox: OutboxStore,
  consumers: OrderPlacedConsumers,
  now: () => Date,
  settings: OutboxPublisherSettings = defaultOutboxPublisherSettings,
  randomFraction: () => number = Math.random
): OutboxPublisher {
  let polling: ReturnType<typeof setInterval> | null = null;

  async function deliver(event: OrderPlaced, eventId: string): Promise<void> {
    await consumers.emptyCart(event.cartId);
    await consumers.clearCartPromotion(event.cartId);
    if (event.promotionCode !== null) {
      await consumers.countPromotionUse(event.promotionCode, event.orderId, eventId);
    }
    await consumers.sendConfirmation(event);
  }

  async function giveUpOrWaitLonger(row: OutboxRow, failure: unknown): Promise<"deadLettered" | "retried"> {
    const attempts = row.attempts + 1;
    const reason = failure instanceof Error ? failure.message : String(failure);
    if (attempts >= settings.attemptBudget) {
      await outbox.markDeadLettered(row.id, attempts, now().toISOString(), reason);
      return "deadLettered";
    }
    const waitInMilliseconds = backoffDelayInMilliseconds(attempts, settings.backoff, randomFraction());
    await outbox.recordFailure(
      row.id,
      attempts,
      new Date(now().getTime() + waitInMilliseconds).toISOString(),
      reason
    );
    return "retried";
  }

  async function publishDue(): Promise<OutboxPass> {
    let published = 0;
    let retried = 0;
    let deadLettered = 0;
    for (const row of await outbox.readDue(now().toISOString())) {
      try {
        await deliver(row.event, row.id);
        await outbox.markPublished(row.id, now().toISOString());
        published = published + 1;
      } catch (failure) {
        const verdict = await giveUpOrWaitLonger(row, failure);
        if (verdict === "deadLettered") {
          deadLettered = deadLettered + 1;
        } else {
          retried = retried + 1;
        }
      }
    }
    return { published, retried, deadLettered };
  }

  return {
    publishDue,

    startPolling(): void {
      if (polling !== null) {
        return;
      }
      polling = setInterval(() => {
        void publishDue().catch(() => undefined);
      }, settings.pollingIntervalInMilliseconds);
      polling.unref();
    },

    stopPolling(): void {
      if (polling === null) {
        return;
      }
      clearInterval(polling);
      polling = null;
    }
  };
}
