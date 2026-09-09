package nl.zappymart.application.ports

interface RateLimiter {

    fun allows(key: String): Boolean
}
