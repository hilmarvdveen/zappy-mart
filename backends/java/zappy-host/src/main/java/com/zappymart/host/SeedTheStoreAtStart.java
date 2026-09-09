package com.zappymart.host;

import com.zappymart.application.development.ResetSeed;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("development")
public class SeedTheStoreAtStart implements ApplicationRunner {

    private static final Logger LOGGER = LoggerFactory.getLogger(SeedTheStoreAtStart.class);

    private final ResetSeed resetSeed;

    public SeedTheStoreAtStart(ResetSeed resetSeed) {
        this.resetSeed = resetSeed;
    }

    @Override
    public void run(ApplicationArguments arguments) {
        LOGGER.info("The development profile loaded the seed with {} products", resetSeed.execute());
    }
}
