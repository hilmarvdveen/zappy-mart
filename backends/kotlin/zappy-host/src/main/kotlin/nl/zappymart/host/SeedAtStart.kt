package nl.zappymart.host

import nl.zappymart.adapters.seed.SeedLoader
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationRunner
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Profile

@Configuration
@Profile("development")
class SeedAtStart {

    private val log = LoggerFactory.getLogger(SeedAtStart::class.java)

    @Bean
    fun loadTheSeedAtStart(seedLoader: SeedLoader) = ApplicationRunner { _ ->
        log.info("Loaded {} products from contract/seed", seedLoader.load())
    }
}
