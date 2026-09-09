import type { UserError } from "@zappy/shared";
import { toStoredDateTime } from "@zappy/shared";
import type { WishlistEntry } from "../domain/wishlist.js";
import {
  customerOwnerKey,
  newestFirst,
  visitorOwnerKey,
  withProductAdded,
  withProductRemoved
} from "../domain/wishlist.js";
import type { WishlistRepository } from "./ports.js";

export type WishlistOwner = {
  readonly customerId: string | null;
  readonly visitorKey: string | null;
};

export type WishlistOutcome = {
  readonly productIdentifiers: readonly string[];
  readonly errors: readonly UserError[];
};

export type ManageWishlist = {
  read(owner: WishlistOwner): Promise<readonly string[]>;
  add(owner: WishlistOwner, productId: string): Promise<WishlistOutcome>;
  remove(owner: WishlistOwner, productId: string): Promise<WishlistOutcome>;
};

export function ownerKeyFor(owner: WishlistOwner): string | null {
  if (owner.customerId !== null) {
    return customerOwnerKey(owner.customerId);
  }
  return owner.visitorKey === null ? null : visitorOwnerKey(owner.visitorKey);
}

export function manageWishlist(wishlists: WishlistRepository, now: () => Date): ManageWishlist {
  async function entriesFor(ownerKey: string): Promise<readonly WishlistEntry[]> {
    return newestFirst(await wishlists.readByOwnerKey(ownerKey));
  }

  function identifiersOf(entries: readonly WishlistEntry[]): readonly string[] {
    return newestFirst(entries).map((entry) => entry.productId);
  }

  return {
    async read(owner): Promise<readonly string[]> {
      const ownerKey = ownerKeyFor(owner);
      return ownerKey === null ? [] : identifiersOf(await entriesFor(ownerKey));
    },

    async add(owner, productId): Promise<WishlistOutcome> {
      const ownerKey = ownerKeyFor(owner);
      if (ownerKey === null) {
        return { productIdentifiers: [], errors: [] };
      }
      const changed = withProductAdded(
        await entriesFor(ownerKey),
        ownerKey,
        productId,
        toStoredDateTime(now())
      );
      await wishlists.replaceForOwner(ownerKey, changed);
      return { productIdentifiers: identifiersOf(changed), errors: [] };
    },

    async remove(owner, productId): Promise<WishlistOutcome> {
      const ownerKey = ownerKeyFor(owner);
      if (ownerKey === null) {
        return { productIdentifiers: [], errors: [] };
      }
      const changed = withProductRemoved(await entriesFor(ownerKey), productId);
      await wishlists.replaceForOwner(ownerKey, changed);
      return { productIdentifiers: identifiersOf(changed), errors: [] };
    }
  };
}
