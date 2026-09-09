package nl.zappymart.host

import nl.zappymart.adapters.graphql.DateTimeScalar
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.graphql.execution.RuntimeWiringConfigurer

@Configuration
class GraphQlConfiguration {

    @Bean
    fun dateTimeScalarConfigurer() = RuntimeWiringConfigurer { wiring -> wiring.scalar(DateTimeScalar.TYPE) }
}
