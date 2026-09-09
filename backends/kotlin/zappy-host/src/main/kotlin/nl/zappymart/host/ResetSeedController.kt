package nl.zappymart.host

import nl.zappymart.adapters.graphql.ResetSeedPayload
import nl.zappymart.adapters.seed.SeedLoader
import org.springframework.context.annotation.Profile
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.stereotype.Controller

@Controller
@Profile("development")
class ResetSeedController(private val seedLoader: SeedLoader) {

    @MutationMapping
    fun resetSeed(): ResetSeedPayload = ResetSeedPayload(true, seedLoader.load(), emptyList())
}
