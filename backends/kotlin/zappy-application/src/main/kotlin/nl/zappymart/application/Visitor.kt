package nl.zappymart.application

data class Visitor(val customerId: String?, val sessionId: String?, val cartId: String?) {

    val isSignedIn: Boolean get() = customerId != null

    companion object {
        val ANONYMOUS = Visitor(null, null, null)
    }
}
