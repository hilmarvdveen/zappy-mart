package nl.zappymart.adapters.graphql

import java.time.Instant
import nl.zappymart.application.Page
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.cart.Cart
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.ordering.Order
import nl.zappymart.domain.shared.UserError

data class PageInfo(val hasNextPage: Boolean, val endCursor: String?)

data class ProductEdge(val cursor: String, val node: Product)

data class ProductConnection(val edges: List<ProductEdge>, val pageInfo: PageInfo, val totalCount: Int) {

    companion object {
        fun of(page: Page<Product>): ProductConnection {
            val edges = page.items.map { product -> ProductEdge(Cursors.of(product.id), product) }
            return ProductConnection(edges, PageInfo(page.hasNextPage, edges.lastOrNull()?.cursor), page.totalCount)
        }
    }
}

data class OrderEdge(val cursor: String, val node: Order)

data class OrderConnection(val edges: List<OrderEdge>, val pageInfo: PageInfo, val totalCount: Int) {

    companion object {
        fun of(page: Page<Order>): OrderConnection {
            val edges = page.items.map { order -> OrderEdge(Cursors.of(order.id), order) }
            return OrderConnection(edges, PageInfo(page.hasNextPage, edges.lastOrNull()?.cursor), page.totalCount)
        }
    }
}

data class ProductFilterInput(
    val categorySlug: String? = null,
    val nameContains: String? = null,
    val inStockOnly: Boolean? = null,
)

data class RegisterInput(val email: String, val name: String, val password: String)

data class LoginInput(val email: String, val password: String, val device: String? = null)

data class AuthenticationPayload(
    val customer: Customer?,
    val accessToken: String?,
    val accessTokenExpiresAt: Instant?,
    val errors: List<UserError>,
)

data class CartPayload(val cart: Cart?, val availableStock: Int?, val errors: List<UserError>)

data class OrderPayload(val order: Order?, val errors: List<UserError>)

data class LogoutPayload(val success: Boolean, val errors: List<UserError>)

data class RevokeSessionPayload(val sessions: List<Session>, val errors: List<UserError>)

data class WishlistPayload(val products: List<Product>, val errors: List<UserError>)

data class ResetSeedPayload(val success: Boolean, val loadedProducts: Int, val errors: List<UserError>)
