package nl.zappymart.adapters.security

import java.time.Duration
import java.util.concurrent.ConcurrentHashMap
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.RateLimiter
import org.springframework.stereotype.Component

@Component
class InMemoryRateLimiter(private val clock: Clock) : RateLimiter {

    private val attempts = ConcurrentHashMap<String, MutableList<Long>>()

    override fun allows(key: String): Boolean {
        val now = clock.moment().toEpochMilli()
        val within = attempts.computeIfAbsent(key) { _ -> mutableListOf() }
        synchronized(within) {
            within.removeIf { moment -> now - moment > WINDOW.toMillis() }
            if (within.size >= MAXIMUM_ATTEMPTS) {
                return false
            }
            within.add(now)
            return true
        }
    }

    fun forget() {
        attempts.clear()
    }

    private companion object {
        const val MAXIMUM_ATTEMPTS = 20
        val WINDOW: Duration = Duration.ofMinutes(1)
    }
}
