import type { Database } from "@zappy/shared";
import { money } from "@zappy/shared";
import type { PromotionCode } from "../../domain/promotionCode.js";
import type { AppliedPromotionStore, PromotionCodeRepository } from "../../application/ports.js";

type CodeRow = {
  readonly code: string;
  readonly kind: PromotionCode["kind"];
  readonly percentage: number | null;
  readonly amount_value: number | null;
  readonly minimum_subtotal: number | null;
  readonly valid_from: string;
  readonly valid_until: string;
  readonly usage_limit: number | null;
  readonly times_used: number;
};

const codeColumns =
  "code, kind, percentage, amount_value, minimum_subtotal, valid_from, valid_until, usage_limit, times_used";

function toPromotionCode(row: CodeRow): PromotionCode {
  return {
    code: row.code,
    kind: row.kind,
    percentage: row.percentage,
    amount: row.amount_value === null ? null : money(row.amount_value),
    minimumSubtotal: row.minimum_subtotal === null ? null : money(row.minimum_subtotal),
    validFrom: row.valid_from,
    validUntil: row.valid_until,
    usageLimit: row.usage_limit,
    timesUsed: row.times_used
  };
}

export function sqlPromotionCodeRepository(database: Database): PromotionCodeRepository {
  return {
    async readByCode(code: string): Promise<PromotionCode | null> {
      const row = await database.queryOne<CodeRow>(
        `select ${codeColumns} from promotion_code where code = ?`,
        [code]
      );
      return row === null ? null : toPromotionCode(row);
    },

    async countOneUse(code: string): Promise<void> {
      await database.execute("update promotion_code set times_used = times_used + 1 where code = ?", [code]);
    },

    async replaceAll(codes: readonly PromotionCode[]): Promise<void> {
      await database.execute("delete from promotion_code");
      for (const code of codes) {
        await database.execute(
          `insert into promotion_code (${codeColumns}) values (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            code.code,
            code.kind,
            code.percentage,
            code.amount === null ? null : code.amount.amount,
            code.minimumSubtotal === null ? null : code.minimumSubtotal.amount,
            code.validFrom,
            code.validUntil,
            code.usageLimit,
            code.timesUsed
          ]
        );
      }
    }
  };
}

export function sqlAppliedPromotionStore(database: Database): AppliedPromotionStore {
  return {
    async readByCartIdentifier(cartId: string): Promise<string | null> {
      const row = await database.queryOne<{ code: string }>(
        "select code from applied_promotion where cart_id = ?",
        [cartId]
      );
      return row === null ? null : row.code;
    },

    async write(cartId: string, code: string): Promise<void> {
      await database.transaction(async () => {
        await database.execute("delete from applied_promotion where cart_id = ?", [cartId]);
        await database.execute("insert into applied_promotion (cart_id, code) values (?, ?)", [cartId, code]);
      });
    },

    async remove(cartId: string): Promise<void> {
      await database.execute("delete from applied_promotion where cart_id = ?", [cartId]);
    },

    async removeEverything(): Promise<void> {
      await database.execute("delete from applied_promotion");
    }
  };
}
