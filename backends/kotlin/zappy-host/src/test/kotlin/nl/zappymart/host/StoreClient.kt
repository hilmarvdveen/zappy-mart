package nl.zappymart.host

import java.net.CookieManager
import java.net.CookiePolicy
import java.net.URI
import java.net.http.HttpClient
import java.net.http.HttpRequest
import java.net.http.HttpResponse
import tools.jackson.databind.JsonNode
import tools.jackson.databind.json.JsonMapper

class StoreClient(private val port: Int, private val origin: String? = "http://localhost:5173") {

    private val cookies = CookieManager(null, CookiePolicy.ACCEPT_ALL)

    private val http: HttpClient = HttpClient.newBuilder().cookieHandler(cookies).build()

    private val json = JsonMapper.builder().build()

    var accessToken: String? = null
        private set

    fun ask(document: String): JsonNode {
        val body = json.writeValueAsString(mapOf("query" to document))
        val request = HttpRequest.newBuilder(URI.create("http://localhost:$port/graphql"))
            .header("Content-Type", "application/json")
            .apply { origin?.let { allowed -> header("Origin", allowed) } }
            .apply { accessToken?.let { token -> header("Authorization", "Bearer $token") } }
            .POST(HttpRequest.BodyPublishers.ofString(body))
            .build()
        val response = http.send(request, HttpResponse.BodyHandlers.ofString())
        return json.readTree(response.body())
    }

    fun data(document: String, path: String): JsonNode {
        val answer = ask(document)
        check(answer.get("errors") == null) { "The store answered with errors: ${answer.get("errors")}" }
        return path.split(".").fold(requireNotNull(answer.get("data"))) { node, step ->
            requireNotNull(node.get(step)) { "There is no $step in $node" }
        }
    }

    fun texts(document: String, path: String, field: String): List<String> =
        data(document, path).values().map { node -> node.get(field).asString() }

    fun signsIn(email: String, password: String) {
        val payload = data(
            """mutation { login(input: {email: "$email", password: "$password", device: "Chrome on Windows"}) """ +
                """{ accessToken errors { code } } }""",
            "login",
        )
        accessToken = payload.get("accessToken").asString()
    }

    fun signsOut() {
        accessToken = null
    }

    fun refreshTokenCookie(): String? = cookies.cookieStore.cookies
        .firstOrNull { cookie -> cookie.name == "zappy_refresh" }
        ?.value

    fun cartCookie(): String? = cookies.cookieStore.cookies
        .firstOrNull { cookie -> cookie.name == "zappy_cart" }
        ?.value

    fun withoutOrigin() = StoreClient(port, null)
}
