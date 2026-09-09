package com.zappymart.domain.builders;

import com.zappymart.domain.catalogue.Category;
import com.zappymart.domain.catalogue.Product;
import com.zappymart.domain.shared.Money;

public final class ProductBuilder {

    public static final Category MENS_CLOTHING =
            new Category("category-mens-clothing", "Men's clothing", "mens-clothing");

    public static final Category JEWELLERY =
            new Category("category-jewellery", "Jewellery", "jewellery");

    private String id = "product-01";
    private String name = "A product";
    private String slug = "a-product";
    private Money price = Money.euro(1000);
    private Category category = MENS_CLOTHING;
    private int stock = 10;

    public static ProductBuilder aProduct() {
        return new ProductBuilder();
    }

    public ProductBuilder withId(String newId) {
        this.id = newId;
        return this;
    }

    public ProductBuilder named(String newName) {
        this.name = newName;
        this.slug = newName.toLowerCase(java.util.Locale.ROOT).replace(' ', '-');
        return this;
    }

    public ProductBuilder costing(int cents) {
        this.price = Money.euro(cents);
        return this;
    }

    public ProductBuilder inCategory(Category newCategory) {
        this.category = newCategory;
        return this;
    }

    public ProductBuilder withStock(int newStock) {
        this.stock = newStock;
        return this;
    }

    public Product build() {
        return new Product(id, name, slug, "A description", price, category, stock,
                "/images/products/" + slug + ".svg");
    }
}
