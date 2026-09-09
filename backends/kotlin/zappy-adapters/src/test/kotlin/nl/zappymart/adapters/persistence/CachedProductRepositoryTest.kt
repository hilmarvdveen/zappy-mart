package nl.zappymart.adapters.persistence

import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.builders.aProduct
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class CachedProductRepositoryTest {

    private class CountingProductRepository : ProductRepository {

        var pagesRead = 0
        var countsRead = 0
        var singleProductsRead = 0

        private val catalogue = listOf(aProduct().withId("product-01").named("Cotton jacket").build())

        override fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product> {
            pagesRead += 1
            return catalogue
        }

        override fun count(specification: ProductSpecification): Int {
            countsRead += 1
            return catalogue.size
        }

        override fun findById(productId: String): Product? {
            singleProductsRead += 1
            return catalogue.firstOrNull { product -> product.id == productId }
        }

        override fun findBySlug(slug: String): Product? {
            singleProductsRead += 1
            return catalogue.firstOrNull { product -> product.slug == slug }
        }

        override fun findAllByIds(productIds: List<String>): List<Product> {
            singleProductsRead += 1
            return catalogue.filter { product -> productIds.contains(product.id) }
        }

        override fun reduceStock(quantityPerProductId: Map<String, Int>) = Unit
    }

    private val catalogue = CountingProductRepository()

    private val cached = CachedProductRepository(catalogue)

    @Test
    fun `a page is read once and answered from the cache after that`() {
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        assertThat(catalogue.pagesRead).isEqualTo(1)
    }

    @Test
    fun `a different page is a different question`() {
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        cached.page(ProductSpecification.EVERYTHING, 5, "product-01")
        cached.page(ProductSpecification.of("jewellery", null, null), 5, null)
        assertThat(catalogue.pagesRead).isEqualTo(3)
    }

    @Test
    fun `a count is read once and answered from the cache after that`() {
        assertThat(cached.count(ProductSpecification.EVERYTHING)).isEqualTo(1)
        assertThat(cached.count(ProductSpecification.EVERYTHING)).isEqualTo(1)
        assertThat(catalogue.countsRead).isEqualTo(1)
    }

    @Test
    fun `reserving stock makes the cache read the catalogue again`() {
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        cached.reduceStock(mapOf("product-01" to 1))
        cached.page(ProductSpecification.EVERYTHING, 5, null)
        assertThat(catalogue.pagesRead).isEqualTo(2)
    }

    @Test
    fun `one product is never answered from the cache, because its stock has to be fresh`() {
        cached.findById("product-01")
        cached.findById("product-01")
        cached.findBySlug("cotton-jacket")
        cached.findAllByIds(listOf("product-01"))
        assertThat(catalogue.singleProductsRead).isEqualTo(4)
    }
}
