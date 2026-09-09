import type { UserError } from "@zappy/shared";
import { newIdentifier, toContractDateTime, userError } from "@zappy/shared";
import type { Cart } from "../domain/cart.js";
import {
  emptyCart,
  isQuantityValid,
  lineById,
  quantityAfterAdding,
  withEveryLineRemoved,
  withLineQuantityChanged,
  withLineRemoved,
  withProductAdded
} from "../domain/cart.js";
import type { CartRepository, CatalogueReader } from "./ports.js";

export type VisitorIdentity = {
  readonly customerId: string | null;
  readonly visitorKey: string | null;
};

export type CartOutcome =
  | { readonly kind: "changed"; readonly cart: Cart }
  | { readonly kind: "refused"; readonly errors: readonly UserError[]; readonly availableStock: number | null };

export type ChangeCart = {
  readCart(identity: VisitorIdentity): Promise<Cart>;
  addToCart(identity: VisitorIdentity, productId: string, quantity: number): Promise<CartOutcome>;
  changeLineQuantity(identity: VisitorIdentity, lineId: string, quantity: number): Promise<CartOutcome>;
  removeLine(identity: VisitorIdentity, lineId: string): Promise<CartOutcome>;
  emptyCartByIdentifier(cartId: string): Promise<boolean>;
  moveAnonymousCartToCustomer(visitorKey: string, customerId: string): Promise<void>;
};

export function ownerKeyOf(identity: VisitorIdentity): string {
  if (identity.customerId !== null) {
    return `customer:${identity.customerId}`;
  }
  if (identity.visitorKey !== null) {
    return `visitor:${identity.visitorKey}`;
  }
  return "visitor:unknown";
}

export function changeCart(
  carts: CartRepository,
  catalogue: CatalogueReader,
  now: () => Date
): ChangeCart {
  async function loadOrStart(identity: VisitorIdentity): Promise<Cart> {
    const ownerKey = ownerKeyOf(identity);
    const stored = await carts.readByOwnerKey(ownerKey);
    return stored ?? emptyCart(newIdentifier("cart"), ownerKey, toContractDateTime(now()));
  }

  async function refuseUnlessStocked(
    productId: string,
    wantedQuantity: number
  ): Promise<CartOutcome | null> {
    const product = await catalogue.readProduct(productId);
    if (product === null) {
      return {
        kind: "refused",
        errors: [userError("PRODUCT_NOT_FOUND", `No product has the id ${productId}.`, "productId")],
        availableStock: null
      };
    }
    if (product.stock < wantedQuantity) {
      return {
        kind: "refused",
        errors: [
          userError("OUT_OF_STOCK", `${product.name} has ${product.stock} in stock.`, "quantity")
        ],
        availableStock: product.stock
      };
    }
    return null;
  }

  return {
    async readCart(identity): Promise<Cart> {
      return loadOrStart(identity);
    },

    async addToCart(identity, productId, quantity): Promise<CartOutcome> {
      if (!isQuantityValid(quantity)) {
        return {
          kind: "refused",
          errors: [userError("QUANTITY_INVALID", "A quantity is a whole number of one or more.", "quantity")],
          availableStock: null
        };
      }
      const cart = await loadOrStart(identity);
      const wanted = quantityAfterAdding(cart, productId, quantity);
      const refusal = await refuseUnlessStocked(productId, wanted);
      if (refusal !== null) {
        return refusal;
      }
      const changed = withProductAdded(
        cart,
        newIdentifier("line"),
        productId,
        quantity,
        toContractDateTime(now())
      );
      await carts.write(changed);
      return { kind: "changed", cart: changed };
    },

    async changeLineQuantity(identity, lineId, quantity): Promise<CartOutcome> {
      const cart = await loadOrStart(identity);
      const line = lineById(cart, lineId);
      if (line === null) {
        return {
          kind: "refused",
          errors: [userError("CART_LINE_NOT_FOUND", `No line with the id ${lineId} is in this cart.`, "lineId")],
          availableStock: null
        };
      }
      if (!isQuantityValid(quantity)) {
        return {
          kind: "refused",
          errors: [userError("QUANTITY_INVALID", "A quantity is a whole number of one or more.", "quantity")],
          availableStock: null
        };
      }
      const refusal = await refuseUnlessStocked(line.productId, quantity);
      if (refusal !== null) {
        return refusal;
      }
      const changed = withLineQuantityChanged(cart, lineId, quantity, toContractDateTime(now()));
      await carts.write(changed);
      return { kind: "changed", cart: changed };
    },

    async removeLine(identity, lineId): Promise<CartOutcome> {
      const cart = await loadOrStart(identity);
      if (lineById(cart, lineId) === null) {
        return {
          kind: "refused",
          errors: [userError("CART_LINE_NOT_FOUND", `No line with the id ${lineId} is in this cart.`, "lineId")],
          availableStock: null
        };
      }
      const changed = withLineRemoved(cart, lineId, toContractDateTime(now()));
      await carts.write(changed);
      return { kind: "changed", cart: changed };
    },

    async emptyCartByIdentifier(cartId): Promise<boolean> {
      const cart = await carts.readByIdentifier(cartId);
      if (cart === null) {
        return false;
      }
      await carts.write(withEveryLineRemoved(cart, toContractDateTime(now())));
      return true;
    },

    async moveAnonymousCartToCustomer(visitorKey, customerId): Promise<void> {
      await carts.moveToOwner(`visitor:${visitorKey}`, `customer:${customerId}`);
    }
  };
}
