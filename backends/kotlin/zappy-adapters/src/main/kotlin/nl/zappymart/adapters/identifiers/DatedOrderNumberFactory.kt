package nl.zappymart.adapters.identifiers

import java.security.SecureRandom
import java.time.Instant
import java.time.ZoneOffset
import java.time.format.DateTimeFormatter
import nl.zappymart.application.ports.OrderNumberFactory
import org.springframework.stereotype.Component

@Component
class DatedOrderNumberFactory : OrderNumberFactory {

    private val random = SecureRandom()

    override fun next(moment: Instant): String {
        val day = DAY_FORMAT.format(moment.atOffset(ZoneOffset.UTC))
        val tail = (1..TAIL_LENGTH)
            .map { _ -> ALPHABET[random.nextInt(ALPHABET.length)] }
            .joinToString("")
        return "ZM-$day-$tail"
    }

    private companion object {
        val DAY_FORMAT: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyyMMdd")
        const val ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
        const val TAIL_LENGTH = 6
    }
}
