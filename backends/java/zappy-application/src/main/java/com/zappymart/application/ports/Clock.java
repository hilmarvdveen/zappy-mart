package com.zappymart.application.ports;

import java.time.Instant;

public interface Clock {

    Instant now();
}
