import { shellQuery } from "~/graphql/documents";
import type { StoreConnection } from "~/session/storeConnection.server";
import { totalQuantity } from "./money";

export type ShellData = {
  cartQuantity: number;
  customerName: string | null;
  wishlistCount: number;
};

export async function loadShell(
  connection: StoreConnection,
): Promise<ShellData> {
  const shell = await connection.run(shellQuery, {});
  if (connection.signedIn && shell.me === null) {
    connection.endSession();
  }
  return {
    cartQuantity: totalQuantity(shell.cart.lines),
    customerName: shell.me?.name ?? null,
    wishlistCount: shell.wishlist.length,
  };
}
