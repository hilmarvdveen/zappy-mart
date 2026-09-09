import { CartChangeFragment } from '../api/generated/contract';

export function stockNote(change: CartChangeFragment | null): string | null {
  if (change === null || change.availableStock === null) {
    return null;
  }

  return `We have ${change.availableStock} of this product left.`;
}
