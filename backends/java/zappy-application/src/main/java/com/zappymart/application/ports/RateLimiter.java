package com.zappymart.application.ports;

public interface RateLimiter {

    boolean allows(String key);

    void forgetEverything();
}
