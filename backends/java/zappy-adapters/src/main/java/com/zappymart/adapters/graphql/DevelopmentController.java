package com.zappymart.adapters.graphql;

import com.zappymart.application.development.ResetSeed;
import org.springframework.context.annotation.Profile;
import org.springframework.graphql.data.method.annotation.MutationMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@Profile("development")
public class DevelopmentController {

    private final ResetSeed resetSeed;

    public DevelopmentController(ResetSeed resetSeed) {
        this.resetSeed = resetSeed;
    }

    @MutationMapping
    public ResetSeedPayload resetSeed() {
        return new ResetSeedPayload(true, resetSeed.execute(), List.of());
    }
}
