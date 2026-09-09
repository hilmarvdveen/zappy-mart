export type WishlistEntry = {
  readonly ownerKey: string;
  readonly productId: string;
  readonly addedAt: string;
};

export function customerOwnerKey(customerId: string): string {
  return `customer:${customerId}`;
}

export function visitorOwnerKey(visitorKey: string): string {
  return `visitor:${visitorKey}`;
}

export function withProductAdded(
  entries: readonly WishlistEntry[],
  ownerKey: string,
  productId: string,
  addedAt: string
): readonly WishlistEntry[] {
  if (entries.some((entry) => entry.productId === productId)) {
    return entries;
  }
  return [{ ownerKey, productId, addedAt }, ...entries];
}

export function withProductRemoved(
  entries: readonly WishlistEntry[],
  productId: string
): readonly WishlistEntry[] {
  return entries.filter((entry) => entry.productId !== productId);
}

export function mergedByAdding(
  customerEntries: readonly WishlistEntry[],
  anonymousEntries: readonly WishlistEntry[],
  ownerKey: string
): readonly WishlistEntry[] {
  const merged = [...customerEntries];
  for (const entry of anonymousEntries) {
    if (!merged.some((existing) => existing.productId === entry.productId)) {
      merged.push({ ownerKey, productId: entry.productId, addedAt: entry.addedAt });
    }
  }
  return merged;
}

export function newestFirst(entries: readonly WishlistEntry[]): readonly WishlistEntry[] {
  return [...entries].sort((left, right) => right.addedAt.localeCompare(left.addedAt));
}
