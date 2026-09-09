package nl.zappymart.adapters.graphql

import nl.zappymart.application.Visitor

class RequestContext(
    startingVisitor: Visitor,
    val presentedRefreshToken: String?,
    val device: String,
    private val cookies: Cookies,
) {

    var visitor: Visitor = startingVisitor
        private set

    private val cookiesToSet = mutableListOf<String>()

    fun signedIn(customerId: String, sessionId: String, refreshToken: String) {
        visitor = visitor.copy(customerId = customerId, sessionId = sessionId)
        cookiesToSet.add(cookies.refreshToken(refreshToken))
    }

    fun signedOut() {
        visitor = visitor.copy(customerId = null, sessionId = null)
        cookiesToSet.add(cookies.clearedRefreshToken())
    }

    fun remembersCart(cartId: String) {
        if (visitor.cartId == cartId) {
            return
        }
        visitor = visitor.copy(cartId = cartId)
        cookiesToSet.add(cookies.cart(cartId))
    }

    fun cookiesToSet(): List<String> = cookiesToSet.toList()

    companion object {
        const val KEY = "requestContext"
    }
}
