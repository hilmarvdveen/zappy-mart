import type { Database } from "@zappy/shared";
import { money } from "@zappy/shared";
import type { Order, OrderStatus } from "../../domain/order.js";
import type { OrderRepository } from "../../application/ports.js";

type OrderRow = {
  readonly id: string;
  readonly sequence_number: number;
  readonly order_number: string;
  readonly customer_id: string;
  readonly status: OrderStatus;
  readonly promotion_code: string | null;
  readonly subtotal: number;
  readonly discount: number;
  readonly shipping: number;
  readonly total: number;
  readonly placed_at: string;
};

type LineRow = {
  readonly product_id: string;
  readonly product_name: string;
  readonly unit_price: number;
  readonly quantity: number;
};

const orderColumns =
  "id, sequence_number, order_number, customer_id, status, promotion_code, subtotal, discount, shipping, total, placed_at";

export function sqlOrderRepository(database: Database): OrderRepository {
  async function withLines(row: OrderRow | null): Promise<Order | null> {
    if (row === null) {
      return null;
    }
    const lines = await database.queryAll<LineRow>(
      "select product_id, product_name, unit_price, quantity from order_line where order_id = ? order by ordinal asc",
      [row.id]
    );
    return {
      id: row.id,
      sequenceNumber: row.sequence_number,
      number: row.order_number,
      customerId: row.customer_id,
      status: row.status,
      promotionCode: row.promotion_code,
      subtotal: money(row.subtotal),
      discount: money(row.discount),
      shipping: money(row.shipping),
      total: money(row.total),
      placedAt: row.placed_at,
      lines: lines.map((line) => ({
        productId: line.product_id,
        productName: line.product_name,
        unitPrice: money(line.unit_price),
        quantity: line.quantity,
        lineTotal: money(line.unit_price * line.quantity)
      }))
    };
  }

  return {
    async readById(orderId: string, customerId: string): Promise<Order | null> {
      return withLines(
        await database.queryOne<OrderRow>(
          `select ${orderColumns} from customer_order where id = ? and customer_id = ?`,
          [orderId, customerId]
        )
      );
    },

    async readByIdempotencyKey(idempotencyKey: string, customerId: string): Promise<Order | null> {
      return withLines(
        await database.queryOne<OrderRow>(
          `select ${orderColumns} from customer_order where idempotency_key = ? and customer_id = ?`,
          [idempotencyKey, customerId]
        )
      );
    },

    async readAllForCustomerNewestFirst(customerId: string): Promise<readonly Order[]> {
      const rows = await database.queryAll<OrderRow>(
        `select ${orderColumns} from customer_order where customer_id = ? order by sequence_number desc`,
        [customerId]
      );
      const found: Order[] = [];
      for (const row of rows) {
        const order = await withLines(row);
        if (order !== null) {
          found.push(order);
        }
      }
      return found;
    },

    async nextSequenceNumber(): Promise<number> {
      const row = await database.queryOne<{ highest: number | null }>(
        "select max(sequence_number) as highest from customer_order"
      );
      return (row?.highest ?? 0) + 1;
    },

    async write(order: Order, idempotencyKey: string): Promise<void> {
      await database.execute(
        `insert into customer_order (${orderColumns}, idempotency_key)
         values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          order.id,
          order.sequenceNumber,
          order.number,
          order.customerId,
          order.status,
          order.promotionCode,
          order.subtotal.amount,
          order.discount.amount,
          order.shipping.amount,
          order.total.amount,
          order.placedAt,
          idempotencyKey
        ]
      );
      let ordinal = 0;
      for (const line of order.lines) {
        await database.execute(
          "insert into order_line (order_id, product_id, product_name, unit_price, quantity, ordinal) values (?, ?, ?, ?, ?, ?)",
          [order.id, line.productId, line.productName, line.unitPrice.amount, line.quantity, ordinal]
        );
        ordinal = ordinal + 1;
      }
    },

    async removeEverything(): Promise<void> {
      await database.transaction(async () => {
        await database.execute("delete from order_line");
        await database.execute("delete from customer_order");
        await database.execute("delete from outbox_message");
      });
    }
  };
}
