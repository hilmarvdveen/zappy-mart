package nl.zappymart.application.catalogue

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import nl.zappymart.application.Page
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification

class ListProducts(private val products: ProductRepository) {

    suspend fun execute(
        specification: ProductSpecification,
        first: Int,
        afterProductId: String?,
    ): Page<Product> = coroutineScope {
        val size = Page.sizeAsked(first)
        val oneMoreThanTheSize = async(Dispatchers.IO) { products.page(specification, size + 1, afterProductId) }
        val matching = async(Dispatchers.IO) { products.count(specification) }
        val fetched = oneMoreThanTheSize.await()
        Page(fetched.take(size), fetched.size > size, matching.await())
    }
}
