package nl.zappymart.adapters.time

import java.time.Instant
import nl.zappymart.application.ports.Clock
import org.springframework.stereotype.Component

@Component
class SystemClock : Clock {

    override fun moment(): Instant = Instant.now()
}
