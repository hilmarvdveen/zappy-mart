package com.zappymart.host;

import com.zappymart.adapters.events.InProcessDomainEventPublisher;
import com.zappymart.adapters.mail.ConsoleMailer;
import com.zappymart.adapters.runtime.RandomIdentifierGenerator;
import com.zappymart.adapters.runtime.SystemClock;
import com.zappymart.adapters.runtime.TransactionalUnitOfWork;
import com.zappymart.adapters.security.Argon2PasswordHasher;
import com.zappymart.adapters.security.JsonWebTokenIssuer;
import com.zappymart.adapters.security.SlidingWindowRateLimiter;
import com.zappymart.adapters.graphql.SecuritySettings;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.DomainEventHandler;
import com.zappymart.application.ports.DomainEventPublisher;
import com.zappymart.application.ports.IdentifierGenerator;
import com.zappymart.application.ports.Mailer;
import com.zappymart.application.ports.PasswordHasher;
import com.zappymart.application.ports.RateLimiter;
import com.zappymart.application.ports.TokenIssuer;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.shared.DomainEvent;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.List;

@Configuration
public class AdapterConfiguration {

    @Bean
    public Clock clock() {
        return new SystemClock();
    }

    @Bean
    public IdentifierGenerator identifierGenerator() {
        return new RandomIdentifierGenerator();
    }

    @Bean
    public UnitOfWork unitOfWork(PlatformTransactionManager transactionManager) {
        return new TransactionalUnitOfWork(new TransactionTemplate(transactionManager));
    }

    @Bean
    public PasswordHasher passwordHasher() {
        return new Argon2PasswordHasher();
    }

    @Bean
    public TokenIssuer tokenIssuer(Clock clock) {
        return new JsonWebTokenIssuer(clock);
    }

    @Bean
    public RateLimiter rateLimiter(Clock clock, SecuritySettings securitySettings) {
        return new SlidingWindowRateLimiter(clock, securitySettings.attemptsPerWindow(), securitySettings.window());
    }

    @Bean
    public Mailer mailer() {
        return new ConsoleMailer();
    }

    @Bean
    public DomainEventPublisher domainEventPublisher(List<DomainEventHandler<? extends DomainEvent>> handlers) {
        return new InProcessDomainEventPublisher(handlers);
    }
}
