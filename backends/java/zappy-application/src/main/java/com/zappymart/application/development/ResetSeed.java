package com.zappymart.application.development;

import com.zappymart.application.ports.RateLimiter;
import com.zappymart.application.ports.StoreSeeder;
import com.zappymart.application.ports.UnitOfWork;

public final class ResetSeed {

    private final UnitOfWork unitOfWork;
    private final StoreSeeder storeSeeder;
    private final RateLimiter rateLimiter;

    public ResetSeed(UnitOfWork unitOfWork, StoreSeeder storeSeeder, RateLimiter rateLimiter) {
        this.unitOfWork = unitOfWork;
        this.storeSeeder = storeSeeder;
        this.rateLimiter = rateLimiter;
    }

    public int execute() {
        rateLimiter.forgetEverything();
        return unitOfWork.inTransaction(storeSeeder::emptyTheStoreAndLoadTheSeed);
    }
}
