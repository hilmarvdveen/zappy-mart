package nl.zappymart.adapters.identifiers

import java.util.UUID
import nl.zappymart.application.ports.IdentifierFactory
import org.springframework.stereotype.Component

@Component
class RandomIdentifierFactory : IdentifierFactory {

    override fun next(): String = UUID.randomUUID().toString()
}
