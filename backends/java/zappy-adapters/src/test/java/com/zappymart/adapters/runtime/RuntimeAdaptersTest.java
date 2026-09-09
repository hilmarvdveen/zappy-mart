package com.zappymart.adapters.runtime;

import com.zappymart.adapters.mail.ConsoleMailer;
import com.zappymart.application.ports.Mailer;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.SimpleTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.Instant;
import java.time.temporal.ChronoUnit;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;

class RuntimeAdaptersTest {

    @Test
    void theClockAnswersInUtcWithSecondPrecision() {
        Instant now = new SystemClock().now();

        assertThat(now).isEqualTo(now.truncatedTo(ChronoUnit.SECONDS));
        assertThat(now).isCloseTo(Instant.now(), org.assertj.core.api.Assertions.within(1, ChronoUnit.MINUTES));
    }

    @Test
    void everyIdentifierIsItsOwn() {
        RandomIdentifierGenerator generator = new RandomIdentifierGenerator();

        assertThat(generator.next()).isNotEqualTo(generator.next()).hasSize(36);
    }

    @Test
    void theUnitOfWorkRunsItsWorkAndHandsBackTheAnswer() {
        PlatformTransactionManager transactionManager = new StubTransactionManager();
        TransactionalUnitOfWork unitOfWork = new TransactionalUnitOfWork(new TransactionTemplate(transactionManager));

        assertThat(unitOfWork.inTransaction(() -> "the answer")).isEqualTo("the answer");
    }

    @Test
    void theConsoleMailerAcceptsAMessage() {
        assertThatNoException().isThrownBy(() -> new ConsoleMailer()
                .send(new Mailer.MailMessage("jane@example.com", "Your order", "Thank you")));
    }

    private static final class StubTransactionManager implements PlatformTransactionManager {

        @Override
        public org.springframework.transaction.TransactionStatus getTransaction(
                org.springframework.transaction.TransactionDefinition definition) {
            return new SimpleTransactionStatus();
        }

        @Override
        public void commit(org.springframework.transaction.TransactionStatus status) {
        }

        @Override
        public void rollback(org.springframework.transaction.TransactionStatus status) {
        }
    }
}
