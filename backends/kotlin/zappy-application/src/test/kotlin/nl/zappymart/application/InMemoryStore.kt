package nl.zappymart.application

import java.time.Instant
import nl.zappymart.application.ports.AccessToken
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.DomainEventPublisher
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.IssuedRefreshToken
import nl.zappymart.application.ports.Mailer
import nl.zappymart.application.ports.OrderConfirmation
import nl.zappymart.application.ports.OrderNumberFactory
import nl.zappymart.application.ports.OrderRepository
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.application.ports.ProductRepository
import nl.zappymart.application.ports.PromotionRepository
import nl.zappymart.application.ports.RateLimiter
import nl.zappymart.application.ports.RefreshTokenIssuer
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.application.ports.SignedInVisitor
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.application.ports.WishlistRepository
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.accounts.RefreshToken
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.accounts.Wishlist
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.catalogue.ProductSpecification
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.promotions.Promotion
import nl.zappymart.domain.shared.DomainEvent
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.PromotionCode

class FixedClock(private var moment: Instant = Instant.parse("2026-09-09T10:00:00Z")) : Clock {
    override fun moment(): Instant = moment
    fun movesTo(later: Instant) {
        moment = later
    }
}

class CountingIdentifierFactory : IdentifierFactory {
    private var given = 0
    override fun next(): String {
        given += 1
        return "identifier-$given"
    }
}

class FixedOrderNumberFactory : OrderNumberFactory {
    override fun next(moment: Instant) = "ZM-TEST-1"
}

class DirectUnitOfWork : UnitOfWork {
    override fun <Value> execute(work: () -> Value): Value = work()
}

class RecordingEventPublisher : DomainEventPublisher {
    val published = mutableListOf<DomainEvent>()
    override fun publish(event: DomainEvent) {
        published.add(event)
    }
}

class RecordingMailer : Mailer {
    val sent = mutableListOf<OrderConfirmation>()
    override fun send(confirmation: OrderConfirmation) {
        sent.add(confirmation)
    }
}

class ReversingPasswordHasher : PasswordHasher {
    override fun hash(password: String) = PasswordHash(password.reversed())
    override fun matches(password: String, hash: PasswordHash) = password.reversed() == hash.value
}

class AllowingRateLimiter(private var allowing: Boolean = true) : RateLimiter {
    override fun allows(key: String) = allowing
    fun refusesEverything() {
        allowing = false
    }
}

class InMemoryProducts(products: List<Product> = emptyList()) : ProductRepository {

    private val byId = products.associateBy { product -> product.id }.toMutableMap()

    override fun page(specification: ProductSpecification, size: Int, afterProductId: String?): List<Product> {
        val matching = byId.values.filter { product -> specification.isSatisfiedBy(product) }.sortedBy { product -> product.id }
        val startAt = if (afterProductId == null) 0 else matching.indexOfFirst { product -> product.id == afterProductId } + 1
        return matching.drop(startAt).take(size)
    }

    override fun count(specification: ProductSpecification) =
        byId.values.count { product -> specification.isSatisfiedBy(product) }

    override fun findById(productId: String) = byId[productId]

    override fun findBySlug(slug: String) = byId.values.firstOrNull { product -> product.slug == slug }

    override fun findAllByIds(productIds: List<String>) = productIds.mapNotNull { productId -> byId[productId] }

    override fun reduceStock(quantityPerProductId: Map<String, Int>) {
        quantityPerProductId.forEach { (productId, quantity) ->
            val product = requireNotNull(byId[productId])
            byId[productId] = product.withStockReducedBy(quantity)
        }
    }
}

class InMemoryCarts : CartRepository {

    private val byId = mutableMapOf<String, Cart>()

    override fun findById(cartId: String) = byId[cartId]

    override fun findByCustomerId(customerId: String) =
        byId.values.firstOrNull { cart -> cart.customerId == customerId }

    override fun save(cart: Cart): Cart {
        byId[cart.id] = cart
        return cart
    }

    override fun delete(cartId: String) {
        byId.remove(cartId)
    }
}

class InMemoryPromotions(promotions: List<Promotion> = emptyList()) : PromotionRepository {

    private val byCode = promotions.associateBy { promotion -> promotion.code.value }.toMutableMap()

    override fun findByCode(code: PromotionCode) = byCode[code.value]

    override fun save(promotion: Promotion) {
        byCode[promotion.code.value] = promotion
    }
}

class InMemoryOrders : OrderRepository {

    private val placed = mutableListOf<Order>()

    override fun save(order: Order): Order {
        placed.add(order)
        return order
    }

    override fun page(customerId: String, size: Int, afterOrderId: String?): List<Order> {
        val newestFirst = placed.filter { order -> order.customerId == customerId }.reversed()
        val startAt = if (afterOrderId == null) 0 else newestFirst.indexOfFirst { order -> order.id == afterOrderId } + 1
        return newestFirst.drop(startAt).take(size)
    }

    override fun count(customerId: String) = placed.count { order -> order.customerId == customerId }

    override fun findForCustomer(orderId: String, customerId: String) =
        placed.firstOrNull { order -> order.id == orderId && order.customerId == customerId }
}

class InMemoryCustomers(customers: List<Customer> = emptyList()) : CustomerRepository {

    private val byId = customers.associateBy { customer -> customer.id }.toMutableMap()

    override fun findById(customerId: String) = byId[customerId]

    override fun findByEmail(email: EmailAddress) = byId.values.firstOrNull { customer -> customer.email == email }

    override fun save(customer: Customer): Customer {
        byId[customer.id] = customer
        return customer
    }
}

class InMemorySessions : SessionRepository {

    private val sessions = mutableMapOf<String, Session>()

    private val tokens = mutableMapOf<String, RefreshToken>()

    override fun save(session: Session): Session {
        sessions[session.id] = session
        return session
    }

    override fun findById(sessionId: String) = sessions[sessionId]

    override fun findOpenForCustomer(customerId: String, moment: Instant) = sessions.values
        .filter { session -> session.customerId == customerId && session.isOpenAt(moment) }
        .sortedByDescending { session -> session.createdAt }

    override fun saveRefreshToken(token: RefreshToken): RefreshToken {
        tokens[token.tokenHash] = token
        return token
    }

    override fun findRefreshTokenByHash(tokenHash: String) = tokens[tokenHash]

    override fun revokeSessionAndItsTokens(sessionId: String, moment: Instant) {
        sessions[sessionId]?.let { session -> sessions[sessionId] = session.revokedAt(moment) }
        tokens.values.filter { token -> token.sessionId == sessionId }.forEach { token ->
            tokens[token.tokenHash] = token.rotatedAt(token.rotatedAt ?: moment)
        }
    }
}

class InMemoryWishlists : WishlistRepository {

    private val byOwnerId = mutableMapOf<String, Wishlist>()

    override fun findByOwnerId(ownerId: String) = byOwnerId[ownerId] ?: Wishlist.emptyFor(ownerId)

    override fun save(wishlist: Wishlist) {
        byOwnerId[wishlist.ownerId] = wishlist
    }

    override fun delete(ownerId: String) {
        byOwnerId.remove(ownerId)
    }
}

class PredictableAccessTokenIssuer : AccessTokenIssuer {

    private val issued = mutableMapOf<String, SignedInVisitor>()

    override fun issue(customerId: String, sessionId: String, moment: Instant): AccessToken {
        val value = "access-token-for-$customerId-$sessionId"
        issued[value] = SignedInVisitor(customerId, sessionId)
        return AccessToken(value, moment.plusSeconds(900))
    }

    override fun verify(token: String) = issued[token]
}

class PredictableRefreshTokenIssuer : RefreshTokenIssuer {

    private var given = 0

    override fun issue(): IssuedRefreshToken {
        given += 1
        return IssuedRefreshToken("refresh-$given", hashOf("refresh-$given"))
    }

    override fun hashOf(value: String) = "hash-of-$value"
}
