package nl.zappymart.adapters.persistence

import java.util.concurrent.ConcurrentHashMap
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification

class CachedProductRepository(private val products: ProductRepository) : ProductRepository {

    private data class PageKey(val specification: ProductSpecification, val size: Int, val afterProductId: String?)

    private val pages = ConcurrentHashMap<PageKey, List<Product>>()

    private val counts = ConcurrentHashMap<ProductSpecification, Int>()

    override fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product> =
        pages.computeIfAbsent(PageKey(specification, size, afterProductId)) { key ->
            products.page(key.specification, key.size, key.afterProductId)
        }

    override fun count(specification: ProductSpecification): Int =
        counts.computeIfAbsent(specification) { key -> products.count(key) }

    override fun findById(productId: String): Product? = products.findById(productId)

    override fun findBySlug(slug: String): Product? = products.findBySlug(slug)

    override fun findAllByIds(productIds: List<String>): List<Product> = products.findAllByIds(productIds)

    override fun reduceStock(quantityPerProductId: Map<String, Int>) {
        products.reduceStock(quantityPerProductId)
        forget()
    }

    fun forget() {
        pages.clear()
        counts.clear()
    }
}
