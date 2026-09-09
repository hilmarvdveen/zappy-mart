package nl.zappymart.application.catalogue

import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.catalogue.Product

class FindProduct(private val products: ProductRepository) {

    fun execute(slug: String): Product? = products.findBySlug(slug)
}
