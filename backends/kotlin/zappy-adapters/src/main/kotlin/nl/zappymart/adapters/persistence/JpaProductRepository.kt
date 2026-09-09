package nl.zappymart.adapters.persistence

import jakarta.persistence.EntityManager
import jakarta.persistence.criteria.CriteriaBuilder
import jakarta.persistence.criteria.Predicate
import jakarta.persistence.criteria.Root
import nl.zappymart.adapters.persistence.entities.CategoryEntity
import nl.zappymart.adapters.persistence.entities.ProductEntity
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaProductRepository(
    private val products: ProductEntities,
    private val entityManager: EntityManager,
) : ProductRepository {

    override fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product> {
        if (size <= 0) {
            return emptyList()
        }
        val builder = entityManager.criteriaBuilder
        val query = builder.createQuery(ProductEntity::class.java)
        val root = query.from(ProductEntity::class.java)
        query.where(*whereParts(specification, afterProductId, root, builder).toTypedArray())
        query.orderBy(builder.asc(root.get<Int>("cataloguePosition")))
        return entityManager.createQuery(query)
            .setMaxResults(size)
            .resultList
            .map { entity -> entity.asProduct() }
    }

    override fun count(specification: ProductSpecification): Int {
        val builder = entityManager.criteriaBuilder
        val query = builder.createQuery(Long::class.javaObjectType)
        val root = query.from(ProductEntity::class.java)
        query.select(builder.count(root))
        query.where(*whereParts(specification, null, root, builder).toTypedArray())
        return entityManager.createQuery(query).singleResult.toInt()
    }

    override fun findById(productId: String): Product? =
        products.findById(productId).orElse(null)?.asProduct()

    override fun findBySlug(slug: String): Product? = products.findBySlug(slug)?.asProduct()

    override fun findAllByIds(productIds: List<String>): List<Product> =
        if (productIds.isEmpty()) emptyList() else products.findByIdIn(productIds).map { entity -> entity.asProduct() }

    @Transactional
    override fun reduceStock(quantityPerProductId: Map<String, Int>) {
        quantityPerProductId.forEach { (productId, quantity) ->
            val entity = products.findById(productId).orElseThrow {
                IllegalStateException("Product $productId disappeared while the order was being placed")
            }
            check(entity.stock >= quantity) {
                "Product $productId has ${entity.stock} in stock and $quantity were reserved"
            }
            entity.stock -= quantity
            products.save(entity)
        }
    }

    private fun whereParts(
        specification: ProductSpecification,
        afterProductId: String?,
        root: Root<ProductEntity>,
        builder: CriteriaBuilder,
    ): List<Predicate> {
        val parts = mutableListOf(predicateFor(specification, root, builder))
        val afterPosition = afterProductId?.let { productId -> products.findById(productId).orElse(null) }
        if (afterPosition != null) {
            parts.add(builder.gt(root.get<Int>("cataloguePosition"), afterPosition.cataloguePosition))
        }
        return parts
    }

    private fun predicateFor(
        specification: ProductSpecification,
        root: Root<ProductEntity>,
        builder: CriteriaBuilder,
    ): Predicate = when (specification) {
        is ProductSpecification.InCategory -> builder.equal(
            root.get<CategoryEntity>("category").get<String>("slug"),
            specification.categorySlug,
        )

        is ProductSpecification.NameContains -> builder.like(
            builder.lower(root.get("name")),
            "%${specification.text.lowercase()}%",
        )

        is ProductSpecification.InStock -> builder.gt(root.get<Int>("stock"), 0)

        is ProductSpecification.MatchingAll -> builder.and(
            *specification.parts.map { part -> predicateFor(part, root, builder) }.toTypedArray(),
        )
    }
}
