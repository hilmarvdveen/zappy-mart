package nl.zappymart.domain.builders

import nl.zappymart.domain.catalogue.Category
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.Money

class ProductBuilder {

    private var id = "product-01"
    private var name = "A product"
    private var slug = "a-product"
    private var price = Money.euro(1000)
    private var category = Category("category-electronics", "Electronics", "electronics")
    private var stock = 10

    fun withId(id: String) = apply { this.id = id }

    fun named(name: String) = apply {
        this.name = name
        this.slug = name.lowercase().replace(" ", "-")
    }

    fun costing(amountInCents: Int) = apply { price = Money.euro(amountInCents) }

    fun inCategory(slug: String) = apply { category = Category("category-$slug", slug, slug) }

    fun withStock(stock: Int) = apply { this.stock = stock }

    fun build() = Product(id, name, slug, "A description", price, category, stock, "/images/products/$slug.svg")
}

fun aProduct() = ProductBuilder()
