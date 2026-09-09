package com.zappymart.application.ports;

import com.zappymart.domain.shared.DomainEvent;

public interface DomainEventHandler<TEvent extends DomainEvent> {

    Class<TEvent> eventType();

    void handle(TEvent event);
}
