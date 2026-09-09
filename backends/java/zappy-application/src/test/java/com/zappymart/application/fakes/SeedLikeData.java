package com.zappymart.application.fakes;

import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.catalogue.Category;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.promotions.Promotion;
import com.zappymart.domain.promotions.PromotionCode;
import com.zappymart.domain.promotions.PromotionRule;
import com.zappymart.domain.shared.EmailAddress;
import com.zappymart.domain.shared.Money;

import java.time.Instant;

public final class SeedLikeData {

    public static final Category WOMENS_CLOTHING =
            new Category("category-womens-clothing", "Women's clothing", "womens-clothing");

    public static final Category ELECTRONICS =
            new Category("category-electronics", "Electronics", "electronics");

    public static final Category JEWELLERY =
            new Category("category-jewellery", "Jewellery", "jewellery");

    public static final Product SHIRT = new Product("product-18", "MBJ Boat Neck",
            "mbj-womens-solid-short-sleeve-boat-neck-v", "A shirt", Money.euro(985), WOMENS_CLOTHING, 25,
            "/images/products/mbj.svg");

    public static final Product LAST_DRIVE = new Product("product-12", "WD 4TB Gaming Drive",
            "wd-4tb-gaming-drive-playstation-4", "A drive", Money.euro(11400), ELECTRONICS, 1,
            "/images/products/wd.svg");

    public static final Product SOLD_OUT_RING = new Product("product-07", "White Gold Plated Princess",
            "white-gold-plated-princess", "A ring", Money.euro(999), JEWELLERY, 0,
            "/images/products/ring.svg");

    public static final Instant WINDOW_OPENS = Instant.parse("2026-01-01T00:00:00Z");

    public static final Instant WINDOW_CLOSES = Instant.parse("2027-12-31T23:59:59Z");

    public static final Promotion WELCOME_TEN = new Promotion(new PromotionCode("WELCOME10"),
            new PromotionRule.PercentageOff(10), null, WINDOW_OPENS, WINDOW_CLOSES, null, 0);

    public static final Promotion FREE_SHIPPING = new Promotion(new PromotionCode("FREESHIP"),
            new PromotionRule.FreeShipping(), null, WINDOW_OPENS, WINDOW_CLOSES, null, 0);

    public static final Promotion SUMMER_LAST_YEAR = new Promotion(new PromotionCode("SUMMER2025"),
            new PromotionRule.PercentageOff(10), null, Instant.parse("2025-06-01T00:00:00Z"),
            Instant.parse("2025-08-31T23:59:59Z"), null, 0);

    public static final Customer JANE = new Customer("customer-01",
            new EmailAddress("jane@example.com"), "Jane Doe", "hashed:correct horse battery staple",
            Instant.parse("2026-01-15T09:00:00Z"));

    private SeedLikeData() {
    }
}
