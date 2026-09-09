package com.zappymart.adapters.runtime;

import com.zappymart.application.ports.IdentifierGenerator;

import java.util.UUID;

public final class RandomIdentifierGenerator implements IdentifierGenerator {

    @Override
    public String next() {
        return UUID.randomUUID().toString();
    }
}
