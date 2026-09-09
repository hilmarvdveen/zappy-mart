package nl.zappymart.adapters.security

import com.nimbusds.jose.jwk.JWKSet
import com.nimbusds.jose.jwk.RSAKey
import com.nimbusds.jose.jwk.source.ImmutableJWKSet
import com.nimbusds.jose.proc.SecurityContext
import java.security.KeyPairGenerator
import java.security.interfaces.RSAPrivateKey
import java.security.interfaces.RSAPublicKey
import java.time.Instant
import java.time.temporal.ChronoUnit
import java.util.UUID
import nl.zappymart.application.ports.AccessToken
import nl.zappymart.application.ports.AccessTokenIssuer
import nl.zappymart.application.ports.SignedInVisitor
import org.springframework.security.oauth2.jose.jws.SignatureAlgorithm
import org.springframework.security.oauth2.jwt.JwsHeader
import org.springframework.security.oauth2.jwt.JwtClaimsSet
import org.springframework.security.oauth2.jwt.JwtEncoderParameters
import org.springframework.security.oauth2.jwt.JwtException
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder
import org.springframework.stereotype.Component

@Component
class JsonWebTokenIssuer : AccessTokenIssuer {

    private val signingKey: RSAKey = generateSigningKey()

    private val encoder = NimbusJwtEncoder(ImmutableJWKSet<SecurityContext>(JWKSet(signingKey)))

    private val decoder = NimbusJwtDecoder.withPublicKey(signingKey.toRSAPublicKey()).build()

    override fun issue(customerId: String, sessionId: String, moment: Instant): AccessToken {
        val expiresAt = moment.plus(LIFETIME_IN_MINUTES, ChronoUnit.MINUTES).truncatedTo(ChronoUnit.SECONDS)
        val claims = JwtClaimsSet.builder()
            .issuer(ISSUER)
            .subject(customerId)
            .issuedAt(moment.truncatedTo(ChronoUnit.SECONDS))
            .expiresAt(expiresAt)
            .claim(SESSION_CLAIM, sessionId)
            .build()
        val header = JwsHeader.with(SignatureAlgorithm.RS256).keyId(signingKey.keyID).build()
        return AccessToken(encoder.encode(JwtEncoderParameters.from(header, claims)).tokenValue, expiresAt)
    }

    override fun verify(token: String): SignedInVisitor? = try {
        val decoded = decoder.decode(token)
        val customerId = decoded.subject
        val sessionId = decoded.getClaimAsString(SESSION_CLAIM)
        if (customerId == null || sessionId == null) null else SignedInVisitor(customerId, sessionId)
    } catch (refused: JwtException) {
        null
    }

    private fun generateSigningKey(): RSAKey {
        val generator = KeyPairGenerator.getInstance("RSA")
        generator.initialize(KEY_SIZE_IN_BITS)
        val pair = generator.generateKeyPair()
        return RSAKey.Builder(pair.public as RSAPublicKey)
            .privateKey(pair.private as RSAPrivateKey)
            .keyID(UUID.randomUUID().toString())
            .build()
    }

    private companion object {
        const val ISSUER = "zappy-mart"
        const val SESSION_CLAIM = "sessionId"
        const val LIFETIME_IN_MINUTES = 15L
        const val KEY_SIZE_IN_BITS = 2048
    }
}
