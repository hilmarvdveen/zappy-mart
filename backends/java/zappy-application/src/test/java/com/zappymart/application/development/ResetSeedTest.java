package com.zappymart.application.development;

import com.zappymart.application.fakes.TheStore;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ResetSeedTest {

    private final TheStore store = new TheStore();

    @Test
    void loadsTheSeedAndForgetsEveryRecordedAttempt() {
        store.rateLimiterAllows = false;
        ResetSeed resetSeed = new ResetSeed(store.unitOfWork, () -> 20, store.rateLimiter);

        assertThat(resetSeed.execute()).isEqualTo(20);
        assertThat(store.rateLimiterAllows).isTrue();
    }
}
