package nl.zappymart.adapters.events

import nl.zappymart.application.ports.DomainEventPublisher
import nl.zappymart.domain.shared.DomainEvent
import org.springframework.context.ApplicationEventPublisher
import org.springframework.stereotype.Component

@Component
class SpringDomainEventPublisher(
    private val publisher: ApplicationEventPublisher,
) : DomainEventPublisher {

    override fun publish(event: DomainEvent) {
        publisher.publishEvent(event)
    }
}
