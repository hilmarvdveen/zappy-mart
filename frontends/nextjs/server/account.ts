import { cache } from "react";

import type {
  AccountQuery,
  SignedInCustomerQuery,
  WishlistQuery,
} from "@/graphql/generated/graphql";
import {
  accountQuery,
  signedInCustomerQuery,
  wishlistQuery,
} from "@/graphql/operations";
import { readSession } from "@/server/session";
import { readFromApi } from "@/server/storefrontClient";

export const readSignedInCustomer = cache(
  async (): Promise<SignedInCustomerQuery | null> =>
    readFromApi(signedInCustomerQuery, {}),
);

export async function readAccount(): Promise<AccountQuery | null> {
  return readFromApi(accountQuery, {});
}

export async function readWishlist(): Promise<WishlistQuery | null> {
  return readFromApi(wishlistQuery, {});
}

export async function holdsAccessToken(): Promise<boolean> {
  const session = await readSession();
  return session.accessToken !== null;
}
