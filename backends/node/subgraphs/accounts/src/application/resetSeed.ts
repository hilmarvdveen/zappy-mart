import { customerOwnerKey } from "../domain/wishlist.js";
import { readSeedCustomers } from "@zappy/shared";
import type {
  CustomerRepository,
  PasswordHasher,
  SessionRepository,
  WishlistRepository
} from "./ports.js";
import type { EmailAddress } from "@zappy/shared";

export function resetAccountSeed(
  customers: CustomerRepository,
  sessions: SessionRepository,
  wishlists: WishlistRepository,
  passwords: PasswordHasher
): () => Promise<number> {
  return async (): Promise<number> => {
    const seeded = readSeedCustomers();
    await sessions.removeEverything();
    await wishlists.removeEverything();
    await customers.removeEverything();
    for (const customer of seeded) {
      await customers.write({
        id: customer.id,
        email: customer.email.toLowerCase() as EmailAddress,
        name: customer.name,
        createdAt: customer.createdAt,
        passwordHash: await passwords.hash(customer.password)
      });
      await wishlists.replaceForOwner(
        customerOwnerKey(customer.id),
        customer.wishlist.map((productId) => ({
          ownerKey: customerOwnerKey(customer.id),
          productId,
          addedAt: customer.createdAt
        }))
      );
    }
    return seeded.length;
  };
}
