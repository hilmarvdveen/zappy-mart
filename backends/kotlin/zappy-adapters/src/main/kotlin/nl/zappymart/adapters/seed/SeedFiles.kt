package nl.zappymart.adapters.seed

import java.time.Instant

data class SeedMoney(val amount: Int, val currency: String)

data class SeedCategory(val id: String, val name: String, val slug: String)

data class SeedProduct(
    val id: String,
    val name: String,
    val slug: String,
    val description: String,
    val price: SeedMoney,
    val categorySlug: String,
    val stock: Int,
    val imageUrl: String?,
)

data class SeedPromotionCode(
    val code: String,
    val kind: String,
    val percentage: Int?,
    val amount: SeedMoney?,
    val minimumSubtotal: SeedMoney?,
    val validFrom: Instant,
    val validUntil: Instant,
    val usageLimit: Int?,
    val timesUsed: Int,
)

data class SeedCustomer(
    val id: String,
    val email: String,
    val name: String,
    val password: String,
    val createdAt: Instant,
    val wishlist: List<String>,
)
