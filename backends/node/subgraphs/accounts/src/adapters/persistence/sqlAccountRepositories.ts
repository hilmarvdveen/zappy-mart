import type { Database } from "@zappy/shared";
import type { EmailAddress } from "@zappy/shared";
import type { RefreshToken, Session } from "../../domain/session.js";
import type { WishlistEntry } from "../../domain/wishlist.js";
import type {
  CustomerRepository,
  RefreshTokenRepository,
  SessionRepository,
  StoredCustomer,
  WishlistRepository
} from "../../application/ports.js";

type CustomerRow = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly created_at: string;
  readonly password_hash: string;
};

type SessionRow = {
  readonly id: string;
  readonly ordinal: number;
  readonly customer_id: string;
  readonly device: string;
  readonly created_at: string;
  readonly last_used_at: string;
  readonly expires_at: string;
  readonly revoked: number;
};

type RefreshTokenRow = {
  readonly id: string;
  readonly session_id: string;
  readonly token_hash: string;
  readonly created_at: string;
  readonly expires_at: string;
  readonly rotated: number;
};

type WishlistRow = {
  readonly owner_key: string;
  readonly product_id: string;
  readonly added_at: string;
};

function toCustomer(row: CustomerRow): StoredCustomer {
  return {
    id: row.id,
    email: row.email as EmailAddress,
    name: row.name,
    createdAt: row.created_at,
    passwordHash: row.password_hash
  };
}

function toSession(row: SessionRow): Session {
  return {
    id: row.id,
    ordinal: row.ordinal,
    customerId: row.customer_id,
    device: row.device,
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
    expiresAt: row.expires_at,
    revoked: row.revoked === 1
  };
}

export function sqlCustomerRepository(database: Database): CustomerRepository {
  const columns = "id, email, name, created_at, password_hash";
  return {
    async readByEmail(email: string): Promise<StoredCustomer | null> {
      const row = await database.queryOne<CustomerRow>(
        `select ${columns} from customer where email = ?`,
        [email.toLowerCase()]
      );
      return row === null ? null : toCustomer(row);
    },

    async readByIdentifier(customerId: string): Promise<StoredCustomer | null> {
      const row = await database.queryOne<CustomerRow>(`select ${columns} from customer where id = ?`, [
        customerId
      ]);
      return row === null ? null : toCustomer(row);
    },

    async write(customer: StoredCustomer): Promise<void> {
      await database.execute(`insert into customer (${columns}) values (?, ?, ?, ?, ?)`, [
        customer.id,
        customer.email,
        customer.name,
        customer.createdAt,
        customer.passwordHash
      ]);
    },

    async removeEverything(): Promise<void> {
      await database.execute("delete from customer");
    }
  };
}

export function sqlSessionRepository(database: Database): SessionRepository {
  const columns = "id, ordinal, customer_id, device, created_at, last_used_at, expires_at, revoked";
  return {
    async readByIdentifier(sessionId: string): Promise<Session | null> {
      const row = await database.queryOne<SessionRow>(`select ${columns} from session where id = ?`, [
        sessionId
      ]);
      return row === null ? null : toSession(row);
    },

    async readOpenForCustomer(customerId: string): Promise<readonly Session[]> {
      const rows = await database.queryAll<SessionRow>(
        `select ${columns} from session where customer_id = ? and revoked = 0 order by created_at desc, ordinal desc`,
        [customerId]
      );
      return rows.map(toSession);
    },

    async nextOrdinal(): Promise<number> {
      const row = await database.queryOne<{ highest: number | null }>(
        "select max(ordinal) as highest from session"
      );
      return (row?.highest ?? 0) + 1;
    },

    async write(session: Session): Promise<void> {
      await database.execute(`insert into session (${columns}) values (?, ?, ?, ?, ?, ?, ?, ?)`, [
        session.id,
        session.ordinal,
        session.customerId,
        session.device,
        session.createdAt,
        session.lastUsedAt,
        session.expiresAt,
        session.revoked ? 1 : 0
      ]);
    },

    async markRevoked(sessionId: string): Promise<void> {
      await database.execute("update session set revoked = 1 where id = ?", [sessionId]);
    },

    async touch(sessionId: string, lastUsedAt: string): Promise<void> {
      await database.execute("update session set last_used_at = ? where id = ?", [lastUsedAt, sessionId]);
    },

    async removeEverything(): Promise<void> {
      await database.transaction(async () => {
        await database.execute("delete from refresh_token");
        await database.execute("delete from session");
      });
    }
  };
}

export function sqlRefreshTokenRepository(database: Database): RefreshTokenRepository {
  const columns = "id, session_id, token_hash, created_at, expires_at, rotated";
  return {
    async readByHash(tokenHash: string): Promise<RefreshToken | null> {
      const row = await database.queryOne<RefreshTokenRow>(
        `select ${columns} from refresh_token where token_hash = ?`,
        [tokenHash]
      );
      if (row === null) {
        return null;
      }
      return {
        id: row.id,
        sessionId: row.session_id,
        tokenHash: row.token_hash,
        createdAt: row.created_at,
        expiresAt: row.expires_at,
        rotated: row.rotated === 1
      };
    },

    async write(token: RefreshToken): Promise<void> {
      await database.execute(`insert into refresh_token (${columns}) values (?, ?, ?, ?, ?, ?)`, [
        token.id,
        token.sessionId,
        token.tokenHash,
        token.createdAt,
        token.expiresAt,
        token.rotated ? 1 : 0
      ]);
    },

    async markRotated(tokenId: string): Promise<void> {
      await database.execute("update refresh_token set rotated = 1 where id = ?", [tokenId]);
    },

    async markEveryTokenRotatedForSession(sessionId: string): Promise<void> {
      await database.execute("update refresh_token set rotated = 1 where session_id = ?", [sessionId]);
    }
  };
}

export function sqlWishlistRepository(database: Database): WishlistRepository {
  return {
    async readByOwnerKey(ownerKey: string): Promise<readonly WishlistEntry[]> {
      const rows = await database.queryAll<WishlistRow>(
        "select owner_key, product_id, added_at from wishlist_entry where owner_key = ? order by ordinal asc",
        [ownerKey]
      );
      return rows.map((row) => ({
        ownerKey: row.owner_key,
        productId: row.product_id,
        addedAt: row.added_at
      }));
    },

    async replaceForOwner(ownerKey: string, entries: readonly WishlistEntry[]): Promise<void> {
      await database.transaction(async () => {
        await database.execute("delete from wishlist_entry where owner_key = ?", [ownerKey]);
        let ordinal = 0;
        for (const entry of entries) {
          await database.execute(
            "insert into wishlist_entry (owner_key, product_id, added_at, ordinal) values (?, ?, ?, ?)",
            [ownerKey, entry.productId, entry.addedAt, ordinal]
          );
          ordinal = ordinal + 1;
        }
      });
    },

    async removeEverything(): Promise<void> {
      await database.execute("delete from wishlist_entry");
    }
  };
}
