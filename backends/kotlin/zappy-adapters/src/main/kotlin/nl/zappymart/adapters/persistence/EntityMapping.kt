package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.CartEntity
import nl.zappymart.adapters.persistence.entities.CategoryEntity
import nl.zappymart.adapters.persistence.entities.CustomerEntity
import nl.zappymart.adapters.persistence.entities.OrderEntity
import nl.zappymart.adapters.persistence.entities.ProductEntity
import nl.zappymart.adapters.persistence.entities.PromotionEntity
import nl.zappymart.adapters.persistence.entities.RefreshTokenEntity
import nl.zappymart.adapters.persistence.entities.SessionEntity
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.cart.CartLine
import nl.zappymart.domain.catalogue.Category
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.ordering.OrderLine
import nl.zappymart.domain.ordering.OrderStatus
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.promotions.PromotionKind
import nl.zappymart.domain.promotions.PromotionRule
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Money
import nl.zappymart.domain.shared.PromotionCode

fun CategoryEntity.asCategory() = Category(id, name, slug)

fun ProductEntity.asProduct() = Product(
    id = id,
    name = name,
    slug = slug,
    description = description,
    price = Money(priceAmount, currency),
    category = category.asCategory(),
    stock = stock,
    imageUrl = imageUrl,
)

fun CartEntity.asCart(): Cart = Cart(
    id = id,
    customerId = customerId,
    lines = lines.map { line -> CartLine(line.id, line.product.asProduct(), line.quantity) },
    promotionCode = promotionCode?.let { code -> PromotionCode.of(code) },
    promotion = null,
    updatedAt = updatedAt,
)

fun PromotionEntity.asPromotion(): Promotion = Promotion(
    code = PromotionCode.of(code),
    rule = when (PromotionKind.valueOf(kind)) {
        PromotionKind.PERCENTAGE -> PromotionRule.Percentage(requireNotNull(percentage))
        PromotionKind.FIXED_AMOUNT -> PromotionRule.FixedAmount(Money(requireNotNull(amount), currency))
        PromotionKind.FREE_SHIPPING -> PromotionRule.FreeShipping
    },
    minimumSubtotal = minimumSubtotal?.let { value -> Money(value, currency) },
    validFrom = validFrom,
    validUntil = validUntil,
    usageLimit = usageLimit,
    timesUsed = timesUsed,
)

fun OrderEntity.asOrder(): Order = Order(
    id = id,
    number = number,
    customerId = customerId,
    status = OrderStatus.valueOf(status),
    lines = lines.map { line ->
        OrderLine(line.productId, line.productName, Money(line.unitPrice, line.currency), line.quantity)
    },
    promotionCode = promotionCode?.let { code -> PromotionCode.of(code) },
    subtotal = Money(subtotal, currency),
    discount = Money(discount, currency),
    shipping = Money(shipping, currency),
    total = Money(total, currency),
    placedAt = placedAt,
)

fun CustomerEntity.asCustomer() = Customer(
    id = id,
    email = EmailAddress.ofStored(email),
    name = name,
    passwordHash = PasswordHash(passwordHash),
    createdAt = createdAt,
)

fun SessionEntity.asSession() = Session(
    id = id,
    customerId = customerId,
    device = device,
    createdAt = createdAt,
    lastUsedAt = lastUsedAt,
    expiresAt = expiresAt,
    revokedAt = revokedAt,
)

fun RefreshTokenEntity.asRefreshToken() = RefreshToken(tokenHash, sessionId, issuedAt, expiresAt, rotatedAt)
