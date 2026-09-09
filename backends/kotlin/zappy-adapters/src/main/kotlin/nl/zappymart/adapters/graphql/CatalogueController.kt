package nl.zappymart.adapters.graphql

import nl.zappymart.application.catalogue.FindProduct
import nl.zappymart.application.catalogue.ListCategories
import nl.zappymart.application.catalogue.ListProducts
import nl.zappymart.domain.catalogue.Category
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.stereotype.Controller

@Controller
class CatalogueController(
    private val listProducts: ListProducts,
    private val findProduct: FindProduct,
    private val listCategories: ListCategories,
) {

    @QueryMapping
    suspend fun products(
        @Argument filter: ProductFilterInput?,
        @Argument first: Int?,
        @Argument after: String?,
    ): ProductConnection {
        val specification = ProductSpecification.of(filter?.categorySlug, filter?.nameContains, filter?.inStockOnly)
        return ProductConnection.of(
            listProducts.execute(specification, first ?: DEFAULT_PRODUCT_PAGE_SIZE, Cursors.idOf(after)),
        )
    }

    @QueryMapping
    fun product(@Argument slug: String): Product? = findProduct.execute(slug)

    @QueryMapping
    fun categories(): List<Category> = listCategories.execute()

    private companion object {
        const val DEFAULT_PRODUCT_PAGE_SIZE = 24
    }
}
