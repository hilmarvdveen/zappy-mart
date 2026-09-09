import type { SubgraphRequestContext } from "@zappy/shared";
import type { Authenticate } from "../../application/authenticate.js";
import type { ManageSessions } from "../../application/manageSessions.js";
import type { ManageWishlist, WishlistOwner } from "../../application/manageWishlist.js";
import type { CustomerRepository } from "../../application/ports.js";

export type AccountsContext = SubgraphRequestContext & {
  readonly accounts: Authenticate;
  readonly sessions: ManageSessions;
  readonly wishlist: ManageWishlist;
  readonly customers: CustomerRepository;
  wishlistOwner(): WishlistOwner;
  readonly userAgent: string | null;
  readonly callerKey: string;
  rememberVisitor(): string;
  currentSessionId(): string | null;
  rememberCurrentSession(sessionId: string): void;
  resetOwnData(): Promise<void>;
};
