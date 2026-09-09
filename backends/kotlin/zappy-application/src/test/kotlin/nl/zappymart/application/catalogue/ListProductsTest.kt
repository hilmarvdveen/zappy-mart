package nl.zappymart.application.catalogue

import kotlinx.coroutines.test.runTest
import nl.zappymart.application.InMemoryProducts
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.catalogue.ProductSpecification
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ListProductsTest {

    private val catalogue = (1..25).map { position ->
        aProduct()
            .withId("product-%02d".format(position))
            .named("Product $position")
            .withStock(if (position == 7) 0 else 5)
            .build()
    }

    private val listProducts = ListProducts(InMemoryProducts(catalogue))

    @Test
    fun `a page carries the total across every page and says whether more follow`() = runTest {
        val page = listProducts.execute(ProductSpecification.EVERYTHING, 10, null)
        assertThat(page.items).hasSize(10)
        assertThat(page.totalCount).isEqualTo(25)
        assertThat(page.hasNextPage).isTrue()
    }

    @Test
    fun `the last page says no more follow`() = runTest {
        val page = listProducts.execute(ProductSpecification.EVERYTHING, 10, "product-15")
        assertThat(page.items).hasSize(10)
        assertThat(page.hasNextPage).isFalse()
    }

    @Test
    fun `a page larger than one hundred is answered with one hundred`() = runTest {
        val page = listProducts.execute(ProductSpecification.EVERYTHING, 500, null)
        assertThat(page.items).hasSize(25)
        assertThat(page.hasNextPage).isFalse()
    }

    @Test
    fun `the in stock filter changes the total`() = runTest {
        val page = listProducts.execute(ProductSpecification.of(null, null, true), 100, null)
        assertThat(page.totalCount).isEqualTo(24)
    }

    @Test
    fun `a page of nothing is a valid answer`() = runTest {
        val page = listProducts.execute(ProductSpecification.EVERYTHING, 0, null)
        assertThat(page.items).isEmpty()
        assertThat(page.hasNextPage).isTrue()
    }
}
