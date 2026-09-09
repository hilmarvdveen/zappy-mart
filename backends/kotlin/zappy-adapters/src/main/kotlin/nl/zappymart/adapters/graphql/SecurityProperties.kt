package nl.zappymart.adapters.graphql

import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties(prefix = "zappy.security")
data class SecurityProperties(
    val allowedOrigins: List<String> = listOf(
        "http://localhost:5173",
        "http://localhost:3001",
        "http://localhost:4200",
    ),
    val cookiesSecure: Boolean = true,
    val graphQlPath: String = "/graphql",
)
