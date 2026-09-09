package com.zappymart.adapters.persistence;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.time.Instant;

@Entity
@Table(name = "promotions")
class PromotionRow {

    @Id
    @Column(name = "code", nullable = false)
    String code;

    @Column(name = "kind", nullable = false)
    String kind;

    @Column(name = "percentage")
    Integer percentage;

    @Column(name = "amount")
    Integer amount;

    @Column(name = "minimum_subtotal")
    Integer minimumSubtotal;

    @Column(name = "valid_from", nullable = false)
    Instant validFrom;

    @Column(name = "valid_until", nullable = false)
    Instant validUntil;

    @Column(name = "usage_limit")
    Integer usageLimit;

    @Column(name = "times_used", nullable = false)
    int timesUsed;

    protected PromotionRow() {
    }

    PromotionRow(String code, String kind, Integer percentage, Integer amount, Integer minimumSubtotal,
                 Instant validFrom, Instant validUntil, Integer usageLimit, int timesUsed) {
        this.code = code;
        this.kind = kind;
        this.percentage = percentage;
        this.amount = amount;
        this.minimumSubtotal = minimumSubtotal;
        this.validFrom = validFrom;
        this.validUntil = validUntil;
        this.usageLimit = usageLimit;
        this.timesUsed = timesUsed;
    }
}
