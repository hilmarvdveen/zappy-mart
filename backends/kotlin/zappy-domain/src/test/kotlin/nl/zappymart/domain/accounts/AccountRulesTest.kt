package nl.zappymart.domain.accounts

import java.time.Instant
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class AccountRulesTest {

    @Test
    fun `an email address is trimmed and lowercased`() {
        val parsed = EmailAddress.of("  JANE@Example.COM ") as Result.Success
        assertThat(parsed.value.value).isEqualTo("jane@example.com")
    }

    @Test
    fun `text that is not an address is refused`() {
        val refused = EmailAddress.of("jane at example") as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.EMAIL_INVALID)
    }

    @Test
    fun `a password shorter than twelve characters is refused`() {
        val refused = PasswordPolicy.check("short") as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.PASSWORD_TOO_SHORT)
    }

    @Test
    fun `a password longer than one hundred and twenty eight characters is refused`() {
        val refused = PasswordPolicy.check("x".repeat(129)) as Result.Refused
        assertThat(refused.errors.map { error -> error.code }).containsExactly(UserErrorCode.PASSWORD_TOO_LONG)
    }

    @Test
    fun `the seed password clears the policy`() {
        assertThat(PasswordPolicy.check("correct horse battery staple")).isInstanceOf(Result.Success::class.java)
    }

    @Test
    fun `a password hash never prints itself`() {
        assertThat(PasswordHash("argon2id-secret").toString()).doesNotContain("secret")
    }

    @Test
    fun `a session is closed once it is revoked`() {
        val moment = Instant.parse("2026-09-09T10:00:00Z")
        val session = Session("session-01", "customer-01", "Chrome", moment, moment, moment.plusSeconds(60), null)
        assertThat(session.isOpenAt(moment)).isTrue()
        assertThat(session.revokedAt(moment).isOpenAt(moment)).isFalse()
        assertThat(session.isOpenAt(moment.plusSeconds(120))).isFalse()
    }

    @Test
    fun `a refresh token is usable once and a rotated one says so`() {
        val moment = Instant.parse("2026-09-09T10:00:00Z")
        val token = RefreshToken("hash", "session-01", moment, moment.plusSeconds(60), null)
        assertThat(token.isUsableAt(moment)).isTrue()
        assertThat(token.rotatedAt(moment).isUsableAt(moment)).isFalse()
        assertThat(token.rotatedAt(moment).wasAlreadyUsed()).isTrue()
    }

    @Test
    fun `a wishlist keeps the newest first and never doubles a product`() {
        val wishlist = Wishlist.emptyFor("customer-01").with("product-01").with("product-02").with("product-01")
        assertThat(wishlist.productIds).containsExactly("product-02", "product-01")
    }

    @Test
    fun `merging a wishlist adds and never replaces`() {
        val customer = Wishlist("customer-01", listOf("product-05"))
        val anonymous = Wishlist("cart-01", listOf("product-03", "product-05"))
        assertThat(customer.mergedWith(anonymous).productIds).containsExactly("product-03", "product-05")
    }

    @Test
    fun `removing a product that is not saved leaves the list alone`() {
        val wishlist = Wishlist("customer-01", listOf("product-05"))
        assertThat(wishlist.without("product-09").productIds).containsExactly("product-05")
    }
}
