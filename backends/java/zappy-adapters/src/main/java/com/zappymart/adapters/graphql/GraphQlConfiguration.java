package com.zappymart.adapters.graphql;

import com.zappymart.application.accounts.IdentifyVisitor;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.graphql.execution.RuntimeWiringConfigurer;

@Configuration
@EnableConfigurationProperties(SecuritySettings.class)
public class GraphQlConfiguration {

    @Bean
    public RuntimeWiringConfigurer dateTimeScalarConfigurer() {
        return wiringBuilder -> wiringBuilder.scalar(DateTimeScalar.type());
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE)
    public OriginCheckInterceptor originCheckInterceptor(SecuritySettings securitySettings) {
        return new OriginCheckInterceptor(securitySettings);
    }

    @Bean
    @Order(Ordered.HIGHEST_PRECEDENCE + 1)
    public RequestContextInterceptor requestContextInterceptor(IdentifyVisitor identifyVisitor) {
        return new RequestContextInterceptor(identifyVisitor);
    }
}
