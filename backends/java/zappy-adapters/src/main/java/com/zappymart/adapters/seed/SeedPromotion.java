package com.zappymart.adapters.seed;

public record SeedPromotion(
        String code,
        String kind,
        Integer percentage,
        SeedMoney amount,
        SeedMoney minimumSubtotal,
        String validFrom,
        String validUntil,
        Integer usageLimit,
        int timesUsed) {
}
