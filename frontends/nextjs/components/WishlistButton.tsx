"use client";

import { useActionState } from "react";

import { SubmitButton } from "@/components/SubmitButton";
import { UserErrorMessages } from "@/components/UserErrorMessages";
import {
  removeProductFromWishlist,
  saveProductToWishlist,
} from "@/server/actions/wishlistActions";
import { untouchedAction } from "@/server/actionState";

export function WishlistButton({
  productId,
  saved,
}: {
  productId: string;
  saved: boolean;
}) {
  const [state, submit] = useActionState(
    saved ? removeProductFromWishlist : saveProductToWishlist,
    untouchedAction,
  );

  return (
    <form action={submit}>
      <input type="hidden" name="productId" value={productId} />
      <SubmitButton
        label={saved ? "Remove from wishlist" : "Save to wishlist"}
        busyLabel="Saving"
        tone="secondary"
      />
      <UserErrorMessages errors={state.errors} />
    </form>
  );
}
