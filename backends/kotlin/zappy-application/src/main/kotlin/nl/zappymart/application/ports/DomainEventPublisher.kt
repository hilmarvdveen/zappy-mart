package nl.zappymart.application.ports

import nl.zappymart.domain.shared.DomainEvent

interface DomainEventPublisher {

    fun publish(event: DomainEvent)
}
