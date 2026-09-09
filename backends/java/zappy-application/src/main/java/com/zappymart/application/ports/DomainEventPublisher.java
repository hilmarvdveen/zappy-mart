package com.zappymart.application.ports;

import com.zappymart.domain.shared.DomainEvent;

public interface DomainEventPublisher {

    void publish(DomainEvent event);
}
