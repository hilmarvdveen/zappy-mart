package com.zappymart.adapters.events;

import com.zappymart.application.ports.DomainEventHandler;
import com.zappymart.domain.ordering.OrderPlaced;
import com.zappymart.domain.shared.DomainEvent;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class InProcessDomainEventPublisherTest {

    private static final Instant NOW = Instant.parse("2026-09-09T12:00:00Z");

    private final List<OrderPlaced> handled = new ArrayList<>();

    private final DomainEventHandler<OrderPlaced> placementHandler = new DomainEventHandler<>() {
        @Override
        public Class<OrderPlaced> eventType() {
            return OrderPlaced.class;
        }

        @Override
        public void handle(OrderPlaced event) {
            handled.add(event);
        }
    };

    @Test
    void deliversAnEventToEveryHandlerThatWantsIt() {
        InProcessDomainEventPublisher publisher =
                new InProcessDomainEventPublisher(List.of(placementHandler, placementHandler));
        OrderPlaced event = new OrderPlaced("order-01", "ZM-000001", "customer-01", null, NOW);

        publisher.publish(event);

        assertThat(handled).containsExactly(event, event);
    }

    @Test
    void leavesAHandlerOfAnotherEventAlone() {
        InProcessDomainEventPublisher publisher = new InProcessDomainEventPublisher(List.of(placementHandler));

        publisher.publish(new AnotherEvent(NOW));

        assertThat(handled).isEmpty();
    }

    private record AnotherEvent(Instant occurredAt) implements DomainEvent {
    }
}
