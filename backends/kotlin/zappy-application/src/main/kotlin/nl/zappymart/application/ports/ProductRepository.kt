package nl.zappymart.application.ports

import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification

interface ProductRepository {

    fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product>

    fun count(specification: ProductSpecification): Int

    fun findById(productId: String): Product?

    fun findBySlug(slug: String): Product?

    fun findAllByIds(productIds: List<String>): List<Product>

    fun reduceStock(quantityPerProductId: Map<String, Int>)
}
