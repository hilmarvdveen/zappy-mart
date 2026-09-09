import type { Database } from "@zappy/shared";
import type { Cart } from "../../domain/cart.js";
import type { CartRepository } from "../../application/ports.js";

type CartRow = {
  readonly id: string;
  readonly owner_key: string;
  readonly updated_at: string;
};

type LineRow = {
  readonly id: string;
  readonly product_id: string;
  readonly quantity: number;
};

export function sqlCartRepository(database: Database): CartRepository {
  async function withLines(row: CartRow | null): Promise<Cart | null> {
    if (row === null) {
      return null;
    }
    const lines = await database.queryAll<LineRow>(
      "select id, product_id, quantity from cart_line where cart_id = ? order by ordinal asc",
      [row.id]
    );
    return {
      id: row.id,
      ownerKey: row.owner_key,
      updatedAt: row.updated_at,
      lines: lines.map((line) => ({ id: line.id, productId: line.product_id, quantity: line.quantity }))
    };
  }

  return {
    async readByOwnerKey(ownerKey: string): Promise<Cart | null> {
      return withLines(
        await database.queryOne<CartRow>(
          "select id, owner_key, updated_at from shopping_cart where owner_key = ?",
          [ownerKey]
        )
      );
    },

    async readByIdentifier(cartId: string): Promise<Cart | null> {
      return withLines(
        await database.queryOne<CartRow>(
          "select id, owner_key, updated_at from shopping_cart where id = ?",
          [cartId]
        )
      );
    },

    async write(cart: Cart): Promise<void> {
      await database.transaction(async () => {
        const existing = await database.queryOne<CartRow>(
          "select id, owner_key, updated_at from shopping_cart where id = ?",
          [cart.id]
        );
        if (existing === null) {
          await database.execute(
            "insert into shopping_cart (id, owner_key, updated_at) values (?, ?, ?)",
            [cart.id, cart.ownerKey, cart.updatedAt]
          );
        } else {
          await database.execute("update shopping_cart set owner_key = ?, updated_at = ? where id = ?", [
            cart.ownerKey,
            cart.updatedAt,
            cart.id
          ]);
        }
        await database.execute("delete from cart_line where cart_id = ?", [cart.id]);
        let ordinal = 0;
        for (const line of cart.lines) {
          await database.execute(
            "insert into cart_line (id, cart_id, product_id, quantity, ordinal) values (?, ?, ?, ?, ?)",
            [line.id, cart.id, line.productId, line.quantity, ordinal]
          );
          ordinal = ordinal + 1;
        }
      });
    },

    async moveToOwner(fromOwnerKey: string, toOwnerKey: string): Promise<void> {
      await database.transaction(async () => {
        const anonymous = await database.queryOne<CartRow>(
          "select id, owner_key, updated_at from shopping_cart where owner_key = ?",
          [fromOwnerKey]
        );
        if (anonymous === null) {
          return;
        }
        const existing = await database.queryOne<CartRow>(
          "select id, owner_key, updated_at from shopping_cart where owner_key = ?",
          [toOwnerKey]
        );
        if (existing === null) {
          await database.execute("update shopping_cart set owner_key = ? where id = ?", [
            toOwnerKey,
            anonymous.id
          ]);
          return;
        }
        const anonymousLines = await database.queryAll<LineRow>(
          "select id, product_id, quantity from cart_line where cart_id = ? order by ordinal asc",
          [anonymous.id]
        );
        const customerLines = await database.queryAll<LineRow>(
          "select id, product_id, quantity from cart_line where cart_id = ? order by ordinal asc",
          [existing.id]
        );
        let ordinal = customerLines.length;
        for (const line of anonymousLines) {
          const alreadyThere = customerLines.find((candidate) => candidate.product_id === line.product_id);
          if (alreadyThere === undefined) {
            await database.execute(
              "insert into cart_line (id, cart_id, product_id, quantity, ordinal) values (?, ?, ?, ?, ?)",
              [line.id, existing.id, line.product_id, line.quantity, ordinal]
            );
            ordinal = ordinal + 1;
          } else {
            await database.execute("update cart_line set quantity = ? where id = ?", [
              alreadyThere.quantity + line.quantity,
              alreadyThere.id
            ]);
          }
        }
        await database.execute("delete from cart_line where cart_id = ?", [anonymous.id]);
        await database.execute("delete from shopping_cart where id = ?", [anonymous.id]);
      });
    },

    async removeEverything(): Promise<void> {
      await database.transaction(async () => {
        await database.execute("delete from cart_line");
        await database.execute("delete from shopping_cart");
      });
    }
  };
}
