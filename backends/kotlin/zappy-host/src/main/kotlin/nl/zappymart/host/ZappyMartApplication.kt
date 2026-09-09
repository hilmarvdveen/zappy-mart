package nl.zappymart.host

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.persistence.autoconfigure.EntityScan
import org.springframework.boot.context.properties.ConfigurationPropertiesScan
import org.springframework.boot.runApplication
import org.springframework.context.annotation.ComponentScan
import org.springframework.data.jpa.repository.config.EnableJpaRepositories

@SpringBootApplication
@ComponentScan(basePackages = ["nl.zappymart.host", "nl.zappymart.adapters"])
@ConfigurationPropertiesScan(basePackages = ["nl.zappymart.adapters"])
@EntityScan(basePackages = ["nl.zappymart.adapters.persistence.entities"])
@EnableJpaRepositories(basePackages = ["nl.zappymart.adapters.persistence"])
class ZappyMartApplication

fun main(arguments: Array<String>) {
    runApplication<ZappyMartApplication>(*arguments)
}
