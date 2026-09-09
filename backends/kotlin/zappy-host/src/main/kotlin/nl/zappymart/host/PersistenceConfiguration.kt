package nl.zappymart.host

import nl.zappymart.adapters.persistence.CachedProductRepository
import nl.zappymart.adapters.persistence.JpaProductRepository
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.context.annotation.Primary

@Configuration
class PersistenceConfiguration {

    @Bean
    @Primary
    fun cachedProductRepository(catalogue: JpaProductRepository) = CachedProductRepository(catalogue)
}
