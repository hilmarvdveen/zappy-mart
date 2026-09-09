package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.CartEntity
import nl.zappymart.adapters.persistence.entities.CategoryEntity
import nl.zappymart.adapters.persistence.entities.CustomerEntity
import nl.zappymart.adapters.persistence.entities.OrderEntity
import nl.zappymart.adapters.persistence.entities.ProductEntity
import nl.zappymart.adapters.persistence.entities.PromotionEntity
import nl.zappymart.adapters.persistence.entities.RefreshTokenEntity
import nl.zappymart.adapters.persistence.entities.SessionEntity
import nl.zappymart.adapters.persistence.entities.WishlistEntryEntity
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.Query

interface CategoryEntities : JpaRepository<CategoryEntity, String> {
    fun findAllByOrderByPositionAsc(): List<CategoryEntity>
    fun findBySlug(slug: String): CategoryEntity?
}

interface ProductEntities : JpaRepository<ProductEntity, String> {
    fun findBySlug(slug: String): ProductEntity?
    fun findByIdIn(ids: Collection<String>): List<ProductEntity>
}

interface CartEntities : JpaRepository<CartEntity, String> {
    fun findByCustomerId(customerId: String): CartEntity?
}

interface PromotionEntities : JpaRepository<PromotionEntity, String>

interface OrderEntities : JpaRepository<OrderEntity, String> {
    fun findByCustomerIdOrderBySequenceNumberDesc(customerId: String): List<OrderEntity>
    fun countByCustomerId(customerId: String): Long
    fun findByIdAndCustomerId(orderId: String, customerId: String): OrderEntity?

    @Query("select coalesce(max(placed.sequenceNumber), 0) from OrderEntity placed")
    fun highestSequenceNumber(): Long
}

interface CustomerEntities : JpaRepository<CustomerEntity, String> {
    fun findByEmail(email: String): CustomerEntity?
}

interface SessionEntities : JpaRepository<SessionEntity, String> {
    fun findByCustomerIdOrderByCreatedAtDesc(customerId: String): List<SessionEntity>
}

interface RefreshTokenEntities : JpaRepository<RefreshTokenEntity, String> {
    fun findBySessionId(sessionId: String): List<RefreshTokenEntity>
}

interface WishlistEntries : JpaRepository<WishlistEntryEntity, Long> {
    fun findByOwnerIdOrderByPositionAsc(ownerId: String): List<WishlistEntryEntity>
    fun deleteByOwnerId(ownerId: String)
}
