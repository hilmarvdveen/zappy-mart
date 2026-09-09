package nl.zappymart.domain.catalogue

sealed interface ProductSpecification {

    fun isSatisfiedBy(product: Product): Boolean

    data class InCategory(val categorySlug: String) : ProductSpecification {
        override fun isSatisfiedBy(product: Product) = product.category.slug == categorySlug
    }

    data class NameContains(val text: String) : ProductSpecification {
        override fun isSatisfiedBy(product: Product) = product.name.contains(text, ignoreCase = true)
    }

    data object InStock : ProductSpecification {
        override fun isSatisfiedBy(product: Product) = product.stock > 0
    }

    data class MatchingAll(val parts: List<ProductSpecification>) : ProductSpecification {
        override fun isSatisfiedBy(product: Product) = parts.all { part -> part.isSatisfiedBy(product) }
    }

    companion object {
        val EVERYTHING = MatchingAll(emptyList())

        fun of(categorySlug: String?, nameContains: String?, inStockOnly: Boolean?): ProductSpecification {
            val parts = buildList {
                categorySlug?.let { slug -> add(InCategory(slug)) }
                nameContains?.takeIf { text -> text.isNotBlank() }?.let { text -> add(NameContains(text.trim())) }
                if (inStockOnly == true) add(InStock)
            }
            return MatchingAll(parts)
        }
    }
}
