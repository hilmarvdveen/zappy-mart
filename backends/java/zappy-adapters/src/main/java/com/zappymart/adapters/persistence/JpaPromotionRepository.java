package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.PromotionRepository;
import com.zappymart.domain.promotions.Promotion;
import com.zappymart.domain.promotions.PromotionCode;
import com.zappymart.domain.promotions.PromotionKind;
import com.zappymart.domain.promotions.PromotionRule;
import com.zappymart.domain.shared.Money;

import java.util.Optional;

public final class JpaPromotionRepository implements PromotionRepository {

    private final PromotionRowRepository promotionRows;

    JpaPromotionRepository(PromotionRowRepository promotionRows) {
        this.promotionRows = promotionRows;
    }

    @Override
    public Optional<Promotion> byCode(PromotionCode code) {
        return promotionRows.findById(code.value()).map(JpaPromotionRepository::promotionOf);
    }

    @Override
    public void save(Promotion promotion) {
        promotionRows.save(rowOf(promotion));
    }

    private static Promotion promotionOf(PromotionRow row) {
        Money minimumSubtotal = row.minimumSubtotal == null ? null : Money.euro(row.minimumSubtotal);
        return new Promotion(new PromotionCode(row.code), ruleOf(row), minimumSubtotal,
                row.validFrom, row.validUntil, row.usageLimit, row.timesUsed);
    }

    private static PromotionRule ruleOf(PromotionRow row) {
        return switch (PromotionKind.valueOf(row.kind)) {
            case PERCENTAGE -> new PromotionRule.PercentageOff(row.percentage);
            case FIXED_AMOUNT -> new PromotionRule.FixedAmountOff(Money.euro(row.amount));
            case FREE_SHIPPING -> new PromotionRule.FreeShipping();
        };
    }

    private static PromotionRow rowOf(Promotion promotion) {
        Integer percentage = promotion.rule() instanceof PromotionRule.PercentageOff off ? off.percentage() : null;
        Integer amount = promotion.rule() instanceof PromotionRule.FixedAmountOff off ? off.amount().amount() : null;
        Integer minimumSubtotal = promotion.minimumSubtotal() == null ? null : promotion.minimumSubtotal().amount();
        return new PromotionRow(promotion.code().value(), promotion.rule().kind().name(), percentage, amount,
                minimumSubtotal, promotion.validFrom(), promotion.validUntil(),
                promotion.usageLimit(), promotion.timesUsed());
    }
}
