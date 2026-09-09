package nl.zappymart.adapters.graphql

import graphql.GraphQLContext
import graphql.execution.CoercedVariables
import graphql.language.StringValue
import graphql.schema.CoercingParseLiteralException
import graphql.schema.CoercingSerializeException
import java.time.Instant
import java.util.Locale
import nl.zappymart.application.Visitor
import org.assertj.core.api.Assertions.assertThat
import org.assertj.core.api.Assertions.assertThatThrownBy
import org.junit.jupiter.api.Test

class GraphQlSupportTest {

    private val coercing = DateTimeScalar.TYPE.coercing

    @Test
    fun `a cursor hides the id it carries and gives it back`() {
        val cursor = Cursors.of("product-01")
        assertThat(cursor).isNotEqualTo("product-01")
        assertThat(Cursors.idOf(cursor)).isEqualTo("product-01")
    }

    @Test
    fun `a cursor that is missing or malformed reads as no cursor at all`() {
        assertThat(Cursors.idOf(null)).isNull()
        assertThat(Cursors.idOf("  ")).isNull()
        assertThat(Cursors.idOf("not base sixty four!!")).isNull()
    }

    @Test
    fun `a moment is written in UTC with second precision`() {
        val serialised = coercing.serialize(
            Instant.parse("2026-09-09T14:30:00.123456Z"),
            GraphQLContext.getDefault(),
            Locale.ENGLISH,
        )
        assertThat(serialised).isEqualTo("2026-09-09T14:30:00Z")
    }

    @Test
    fun `a moment is read from a literal and from a variable`() {
        val moment = Instant.parse("2026-09-09T14:30:00Z")
        assertThat(
            coercing.parseLiteral(
                StringValue.of("2026-09-09T14:30:00Z"),
                CoercedVariables.emptyVariables(),
                GraphQLContext.getDefault(),
                Locale.ENGLISH,
            ),
        ).isEqualTo(moment)
        assertThat(coercing.parseValue("2026-09-09T14:30:00Z", GraphQLContext.getDefault(), Locale.ENGLISH))
            .isEqualTo(moment)
    }

    @Test
    fun `something that is not a moment is refused`() {
        assertThatThrownBy {
            coercing.serialize(42, GraphQLContext.getDefault(), Locale.ENGLISH)
        }.isInstanceOf(CoercingSerializeException::class.java)
        assertThatThrownBy {
            coercing.parseLiteral(
                graphql.language.IntValue.of(42),
                CoercedVariables.emptyVariables(),
                GraphQLContext.getDefault(),
                Locale.ENGLISH,
            )
        }.isInstanceOf(CoercingParseLiteralException::class.java)
    }

    @Test
    fun `signing in writes the refresh cookie and signing out clears it`() {
        val context = RequestContext(Visitor.ANONYMOUS, null, "Chrome", Cookies(SecurityProperties()))
        context.signedIn("customer-01", "session-01", "a-refresh-token")
        assertThat(context.visitor.customerId).isEqualTo("customer-01")
        assertThat(context.cookiesToSet()).singleElement().satisfies({ cookie ->
            assertThat(cookie).contains("zappy_refresh=a-refresh-token")
            assertThat(cookie).contains("HttpOnly")
            assertThat(cookie).contains("Secure")
            assertThat(cookie).contains("SameSite=Lax")
            assertThat(cookie).contains("Path=/graphql")
        })

        context.signedOut()
        assertThat(context.visitor.customerId).isNull()
        assertThat(context.cookiesToSet().last()).contains("Max-Age=0")
    }

    @Test
    fun `a cart cookie is written once for a cart the visitor did not have`() {
        val context = RequestContext(Visitor(null, null, "cart-01"), null, "Chrome", Cookies(SecurityProperties()))
        context.remembersCart("cart-01")
        assertThat(context.cookiesToSet()).isEmpty()

        context.remembersCart("cart-02")
        assertThat(context.cookiesToSet()).singleElement().satisfies({ cookie ->
            assertThat(cookie).contains("zappy_cart=cart-02")
            assertThat(cookie).contains("Path=/")
        })
    }

    @Test
    fun `cookies without the secure flag are for a plain http development host`() {
        val cookie = Cookies(SecurityProperties(cookiesSecure = false)).cart("cart-01")
        assertThat(cookie).doesNotContain("Secure")
    }
}
