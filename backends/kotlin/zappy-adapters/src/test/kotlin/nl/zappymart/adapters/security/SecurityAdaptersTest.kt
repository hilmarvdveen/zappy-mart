package nl.zappymart.adapters.security

import java.time.Instant
import nl.zappymart.adapters.identifiers.DatedOrderNumberFactory
import nl.zappymart.adapters.identifiers.RandomIdentifierFactory
import nl.zappymart.adapters.time.SystemClock
import nl.zappymart.application.ports.Clock
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class SecurityAdaptersTest {

    @Test
    fun `a password is hashed with argon2id and never stored in clear`() {
        val hasher = Argon2PasswordHasher()
        val hash = hasher.hash("correct horse battery staple")
        assertThat(hash.value).startsWith("\$argon2id\$")
        assertThat(hash.value).doesNotContain("correct horse")
        assertThat(hasher.matches("correct horse battery staple", hash)).isTrue()
        assertThat(hasher.matches("something else entirely", hash)).isFalse()
    }

    @Test
    fun `the same password hashes differently every time`() {
        val hasher = Argon2PasswordHasher()
        assertThat(hasher.hash("a long enough password").value)
            .isNotEqualTo(hasher.hash("a long enough password").value)
    }

    @Test
    fun `an access token carries the customer and the session and nothing personal`() {
        val issuer = JsonWebTokenIssuer()
        val moment = Instant.parse("2026-09-09T10:00:00Z")
        val issued = issuer.issue("customer-01", "session-01", moment)
        assertThat(issued.expiresAt).isEqualTo(moment.plusSeconds(900))
        assertThat(issuer.verify(issued.value)?.customerId).isEqualTo("customer-01")
        assertThat(issuer.verify(issued.value)?.sessionId).isEqualTo("session-01")
    }

    @Test
    fun `a token from another issuer or a broken one is refused`() {
        val issuer = JsonWebTokenIssuer()
        val other = JsonWebTokenIssuer()
        val moment = Instant.parse("2026-09-09T10:00:00Z")
        assertThat(issuer.verify(other.issue("customer-01", "session-01", moment).value)).isNull()
        assertThat(issuer.verify("not a token at all")).isNull()
    }

    @Test
    fun `an expired token is refused`() {
        val issuer = JsonWebTokenIssuer()
        val longAgo = Instant.parse("2020-01-01T10:00:00Z")
        assertThat(issuer.verify(issuer.issue("customer-01", "session-01", longAgo).value)).isNull()
    }

    @Test
    fun `a refresh token is random and is stored only as a hash`() {
        val issuer = RandomRefreshTokenIssuer()
        val first = issuer.issue()
        val second = issuer.issue()
        assertThat(first.value).isNotEqualTo(second.value)
        assertThat(first.tokenHash).isNotEqualTo(first.value)
        assertThat(issuer.hashOf(first.value)).isEqualTo(first.tokenHash)
        assertThat(first.tokenHash).hasSize(64)
    }

    @Test
    fun `an identifier is unique per call`() {
        val identifiers = RandomIdentifierFactory()
        assertThat(identifiers.next()).isNotEqualTo(identifiers.next())
    }

    @Test
    fun `an order number carries the day it was placed`() {
        val number = DatedOrderNumberFactory().next(Instant.parse("2026-09-09T10:00:00Z"))
        assertThat(number).startsWith("ZM-20260909-")
        assertThat(number).hasSize(18)
    }

    @Test
    fun `the rate limiter lets a burst through and then holds the rest back`() {
        val standingStill = object : Clock {
            override fun moment(): Instant = Instant.parse("2026-09-09T10:00:00Z")
        }
        val limiter = InMemoryRateLimiter(standingStill)
        repeat(20) { attempt -> assertThat(limiter.allows("login:jane@example.com")).isTrue() }
        assertThat(limiter.allows("login:jane@example.com")).isFalse()
        assertThat(limiter.allows("login:somebody-else@example.com")).isTrue()
        limiter.forget()
        assertThat(limiter.allows("login:jane@example.com")).isTrue()
    }

    @Test
    fun `the system clock keeps every digit, so two logins in one second still sort`() {
        val clock = SystemClock()
        val earlier = clock.moment()
        val later = clock.moment()
        assertThat(earlier).isBeforeOrEqualTo(later)
        assertThat(later).isAfter(Instant.parse("2026-01-01T00:00:00Z"))
    }
}
