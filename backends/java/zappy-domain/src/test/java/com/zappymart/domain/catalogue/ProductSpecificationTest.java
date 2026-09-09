package com.zappymart.domain.catalogue;

import org.junit.jupiter.api.Test;

import static com.zappymart.domain.builders.ProductBuilder.JEWELLERY;
import static com.zappymart.domain.builders.ProductBuilder.aProduct;
import static org.assertj.core.api.Assertions.assertThat;

class ProductSpecificationTest {

    private static final Product RING = aProduct().named("White Gold Plated Princess")
            .inCategory(JEWELLERY).withStock(0).build();

    private static final Product JACKET = aProduct().named("Mens Cotton Jacket").withStock(8).build();

    @Test
    void everyProductSatisfiesTheOpenSpecification() {
        assertThat(ProductSpecification.everyProduct().isSatisfiedBy(RING)).isTrue();
    }

    @Test
    void keepsOneCategory() {
        ProductSpecification jewellery = new ProductSpecification.InCategory("jewellery");

        assertThat(jewellery.isSatisfiedBy(RING)).isTrue();
        assertThat(jewellery.isSatisfiedBy(JACKET)).isFalse();
    }

    @Test
    void matchesANameWithoutRegardToCase() {
        ProductSpecification cotton = new ProductSpecification.NameContains("COTTON");

        assertThat(cotton.isSatisfiedBy(JACKET)).isTrue();
        assertThat(cotton.isSatisfiedBy(RING)).isFalse();
    }

    @Test
    void leavesOutWhatHasNoStock() {
        ProductSpecification inStock = new ProductSpecification.InStock();

        assertThat(inStock.isSatisfiedBy(RING)).isFalse();
        assertThat(inStock.isSatisfiedBy(JACKET)).isTrue();
    }

    @Test
    void composesPartsThatAllHaveToHold() {
        ProductSpecification both = ProductSpecification.everyProduct()
                .and(new ProductSpecification.InCategory("jewellery"))
                .and(new ProductSpecification.InStock());

        assertThat(both.isSatisfiedBy(RING)).isFalse();
        assertThat(both.and(ProductSpecification.everyProduct()).isSatisfiedBy(RING)).isFalse();
    }
}
