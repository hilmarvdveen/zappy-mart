package nl.zappymart.adapters.seed

import jakarta.persistence.EntityManager
import nl.zappymart.adapters.persistence.CachedProductRepository
import nl.zappymart.adapters.persistence.entities.CategoryEntity
import nl.zappymart.adapters.persistence.entities.CustomerEntity
import nl.zappymart.adapters.persistence.entities.ProductEntity
import nl.zappymart.adapters.persistence.entities.PromotionEntity
import nl.zappymart.adapters.persistence.entities.WishlistEntryEntity
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.domain.shared.PromotionCode
import org.springframework.core.io.ClassPathResource
import org.springframework.stereotype.Component
import org.springframework.transaction.annotation.Transactional
import tools.jackson.core.type.TypeReference
import tools.jackson.databind.ObjectMapper

@Component
class SeedLoader(
    private val entityManager: EntityManager,
    private val objectMapper: ObjectMapper,
    private val passwords: PasswordHasher,
    private val cachedProducts: CachedProductRepository,
) {

    @Transactional
    fun load(): Int {
        emptyTheStore()
        val categories = readSeedFile<SeedCategory>("categories.json")
        val products = readSeedFile<SeedProduct>("products.json")
        val promotionCodes = readSeedFile<SeedPromotionCode>("promotion-codes.json")
        val customers = readSeedFile<SeedCustomer>("customers.json")

        val categoryBySlug = categories.mapIndexed { position, category ->
            val entity = CategoryEntity(category.id, category.name, category.slug, position)
            entityManager.persist(entity)
            category.slug to entity
        }.toMap()

        products.forEachIndexed { position, product ->
            entityManager.persist(
                ProductEntity(
                    id = product.id,
                    name = product.name,
                    slug = product.slug,
                    description = product.description,
                    priceAmount = product.price.amount,
                    currency = product.price.currency,
                    category = requireNotNull(categoryBySlug[product.categorySlug]) {
                        "The seed puts ${product.id} in the unknown category ${product.categorySlug}"
                    },
                    stock = product.stock,
                    imageUrl = product.imageUrl,
                    cataloguePosition = position,
                ),
            )
        }

        promotionCodes.forEach { code ->
            entityManager.persist(
                PromotionEntity(
                    code = PromotionCode.of(code.code).value,
                    kind = code.kind,
                    percentage = code.percentage,
                    amount = code.amount?.amount,
                    minimumSubtotal = code.minimumSubtotal?.amount,
                    currency = code.amount?.currency ?: code.minimumSubtotal?.currency ?: "EUR",
                    validFrom = code.validFrom,
                    validUntil = code.validUntil,
                    usageLimit = code.usageLimit,
                    timesUsed = code.timesUsed,
                ),
            )
        }

        customers.forEach { customer ->
            entityManager.persist(
                CustomerEntity(
                    id = customer.id,
                    email = customer.email.trim().lowercase(),
                    name = customer.name,
                    passwordHash = passwords.hash(customer.password).value,
                    createdAt = customer.createdAt,
                ),
            )
            customer.wishlist.forEachIndexed { position, productId ->
                entityManager.persist(WishlistEntryEntity(ownerId = customer.id, productId = productId, position = position))
            }
        }

        entityManager.flush()
        entityManager.clear()
        cachedProducts.forget()
        return products.size
    }

    private fun emptyTheStore() {
        TABLES_IN_DELETION_ORDER.forEach { entityName ->
            entityManager.createQuery("delete from $entityName").executeUpdate()
        }
        entityManager.flush()
        entityManager.clear()
        cachedProducts.forget()
    }

    private inline fun <reified Item> readSeedFile(name: String): List<Item> =
        ClassPathResource("$SEED_LOCATION/$name").inputStream.use { stream ->
            objectMapper.readValue(stream, object : TypeReference<List<Item>>() {})
        }

    private companion object {
        const val SEED_LOCATION = "contract-seed"

        val TABLES_IN_DELETION_ORDER = listOf(
            "OrderLineEntity",
            "OrderEntity",
            "CartLineEntity",
            "CartEntity",
            "RefreshTokenEntity",
            "SessionEntity",
            "WishlistEntryEntity",
            "PromotionEntity",
            "ProductEntity",
            "CategoryEntity",
            "CustomerEntity",
        )
    }
}
