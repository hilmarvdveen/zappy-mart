import type { ForwardedHeaders } from "@zappy/shared";
import { askSubgraph } from "@zappy/shared";
import type { OrderPlaced } from "../../domain/orderPlaced.js";
import type { OrderPlacedConsumers } from "../../application/ports.js";

const emptyCartDocument = `
  mutation EmptyCart($cartId: ID!) {
    emptyCart(cartId: $cartId)
  }
`;

const clearCartPromotionDocument = `
  mutation ClearCartPromotion($cartId: ID!) {
    clearCartPromotion(cartId: $cartId)
  }
`;

const countPromotionUseDocument = `
  mutation CountPromotionUse($code: String!, $orderId: ID!, $eventId: ID!) {
    countPromotionUse(code: $code, orderId: $orderId, eventId: $eventId)
  }
`;

const customerByReferenceDocument = `
  query CustomerToNotify($representations: [_Any!]!) {
    _entities(representations: $representations) {
      ... on Customer {
        id
        name
        email
      }
    }
  }
`;

type CustomerAnswer = {
  readonly _entities: readonly ({
    readonly id: string;
    readonly name: string;
    readonly email: string;
  } | null)[];
};

export type ConfirmationMail = {
  readonly to: string;
  readonly subject: string;
  readonly body: string;
};

export type MailTransport = {
  send(mail: ConfirmationMail): Promise<void>;
};

export const consoleMailTransport: MailTransport = {
  async send(mail: ConfirmationMail): Promise<void> {
    console.log(`mail to ${mail.to}: ${mail.subject}`);
  }
};

export function graphOrderPlacedConsumers(
  forwarded: ForwardedHeaders,
  transport: MailTransport = consoleMailTransport
): OrderPlacedConsumers {
  return {
    async emptyCart(cartId: string): Promise<void> {
      await askSubgraph("cart", emptyCartDocument, { cartId }, forwarded, { idempotent: true });
    },

    async clearCartPromotion(cartId: string): Promise<void> {
      await askSubgraph("promotions", clearCartPromotionDocument, { cartId }, forwarded, {
        idempotent: true
      });
    },

    async countPromotionUse(code: string, orderId: string, eventId: string): Promise<void> {
      await askSubgraph("promotions", countPromotionUseDocument, { code, orderId, eventId }, forwarded, {
        idempotent: true
      });
    },

    async sendConfirmation(event: OrderPlaced): Promise<void> {
      const answer = await askSubgraph<CustomerAnswer>(
        "accounts",
        customerByReferenceDocument,
        { representations: [{ __typename: "Customer", id: event.customerId }] },
        forwarded,
        { idempotent: true }
      );
      const customer = answer._entities[0] ?? null;
      if (customer === null) {
        return;
      }
      await transport.send({
        to: customer.email,
        subject: `Your Zappy Mart order ${event.orderNumber}`,
        body: `Thank you ${customer.name}. Order ${event.orderNumber} was placed on ${event.placedAt}.`
      });
    }
  };
}
