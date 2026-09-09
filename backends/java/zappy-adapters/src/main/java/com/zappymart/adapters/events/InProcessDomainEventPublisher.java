package com.zappymart.adapters.events;

import com.zappymart.application.ports.DomainEventHandler;
import com.zappymart.application.ports.DomainEventPublisher;
import com.zappymart.domain.shared.DomainEvent;

import java.util.List;

public final class InProcessDomainEventPublisher implements DomainEventPublisher {

    private final List<DomainEventHandler<? extends DomainEvent>> handlers;

    public InProcessDomainEventPublisher(List<DomainEventHandler<? extends DomainEvent>> handlers) {
        this.handlers = List.copyOf(handlers);
    }

    @Override
    public void publish(DomainEvent event) {
        for (DomainEventHandler<? extends DomainEvent> handler : handlers) {
            if (handler.eventType().isInstance(event)) {
                deliver(handler, event);
            }
        }
    }

    @SuppressWarnings("unchecked")
    private static <TEvent extends DomainEvent> void deliver(DomainEventHandler<TEvent> handler, DomainEvent event) {
        handler.handle((TEvent) event);
    }
}
