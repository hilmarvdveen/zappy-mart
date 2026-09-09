package com.zappymart.host;

import org.junit.jupiter.api.Test;

class CatalogueGraphQlTest extends StoreTest {

    @Test
    void answersTheFourCategoriesInTheOrderOfTheSeed() {
        store.send("{ categories { id name slug } }")
                .jsonPath("$.data.categories.length()").isEqualTo(4)
                .jsonPath("$.data.categories[0].slug").isEqualTo("mens-clothing")
                .jsonPath("$.data.categories[1].name").isEqualTo("Jewellery")
                .jsonPath("$.data.categories[3].slug").isEqualTo("womens-clothing");
    }

    @Test
    void pagesTheCatalogueInTheOrderOfTheSeed() {
        store.send("""
                { products(first: 3) {
                    totalCount
                    pageInfo { hasNextPage endCursor }
                    edges { cursor node { id name price { amount currency } stock category { slug } } }
                } }
                """)
                .jsonPath("$.data.products.totalCount").isEqualTo(20)
                .jsonPath("$.data.products.pageInfo.hasNextPage").isEqualTo(true)
                .jsonPath("$.data.products.edges.length()").isEqualTo(3)
                .jsonPath("$.data.products.edges[0].node.id").isEqualTo("product-01")
                .jsonPath("$.data.products.edges[0].node.price.amount").isEqualTo(10995)
                .jsonPath("$.data.products.edges[0].node.price.currency").isEqualTo("EUR")
                .jsonPath("$.data.products.edges[0].node.category.slug").isEqualTo("mens-clothing")
                .jsonPath("$.data.products.edges[2].node.id").isEqualTo("product-03");
    }

    @Test
    void readsThePageAfterACursor() {
        String cursor = store.valueOf("{ products(first: 3) { pageInfo { endCursor } } }",
                "$.data.products.pageInfo.endCursor");

        store.send("{ products(first: 2, after: \"%s\") { edges { node { id } } } }".formatted(cursor))
                .jsonPath("$.data.products.edges[0].node.id").isEqualTo("product-04")
                .jsonPath("$.data.products.edges[1].node.id").isEqualTo("product-05");
    }

    @Test
    void keepsAtMostOneHundredProductsOnAPage() {
        store.send("{ products(first: 500) { edges { node { id } } pageInfo { hasNextPage } } }")
                .jsonPath("$.data.products.edges.length()").isEqualTo(20)
                .jsonPath("$.data.products.pageInfo.hasNextPage").isEqualTo(false);
    }

    @Test
    void narrowsByCategoryByNameAndToWhatIsInStock() {
        store.send("{ products(filter: { categorySlug: \"jewellery\" }) { totalCount } }")
                .jsonPath("$.data.products.totalCount").isEqualTo(4);
        store.send("{ products(filter: { nameContains: \"jacket\" }) { totalCount } }")
                .jsonPath("$.data.products.totalCount").isEqualTo(4);
        store.send("{ products(filter: { categorySlug: \"jewellery\", inStockOnly: true }) { totalCount } }")
                .jsonPath("$.data.products.totalCount").isEqualTo(3);
        store.send("{ products(filter: { inStockOnly: true }) { totalCount } }")
                .jsonPath("$.data.products.totalCount").isEqualTo(19);
        store.send("{ products(filter: { inStockOnly: false }) { totalCount } }")
                .jsonPath("$.data.products.totalCount").isEqualTo(20);
    }

    @Test
    void answersOneProductBySlugAndNullForASlugNobodyHas() {
        store.send("{ product(slug: \"mens-cotton-jacket\") { id name stock imageUrl } }")
                .jsonPath("$.data.product.id").isEqualTo("product-03")
                .jsonPath("$.data.product.stock").isEqualTo(8)
                .jsonPath("$.data.product.imageUrl").isEqualTo("/images/products/mens-cotton-jacket.svg");
        store.send("{ product(slug: \"a-product-nobody-sells\") { id } }")
                .jsonPath("$.data.product").doesNotExist();
    }

    @Test
    void showsTheProductWithNoStockLikeAnyOther() {
        store.send("{ product(slug: \"white-gold-plated-princess\") { id stock } }")
                .jsonPath("$.data.product.id").isEqualTo("product-07")
                .jsonPath("$.data.product.stock").isEqualTo(0);
    }
}
