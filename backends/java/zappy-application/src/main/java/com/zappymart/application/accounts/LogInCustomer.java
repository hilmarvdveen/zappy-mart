package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.CustomerRepository;
import com.zappymart.application.ports.PasswordHasher;
import com.zappymart.application.ports.RateLimiter;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.shared.EmailAddress;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.util.Optional;

public final class LogInCustomer {

    private final UnitOfWork unitOfWork;
    private final CustomerRepository customerRepository;
    private final PasswordHasher passwordHasher;
    private final SessionOpening sessionOpening;
    private final AnonymousHandover anonymousHandover;
    private final RateLimiter rateLimiter;
    private final String hashThatMatchesNothing;

    public LogInCustomer(UnitOfWork unitOfWork, CustomerRepository customerRepository,
                         PasswordHasher passwordHasher, SessionOpening sessionOpening,
                         AnonymousHandover anonymousHandover, RateLimiter rateLimiter) {
        this.unitOfWork = unitOfWork;
        this.customerRepository = customerRepository;
        this.passwordHasher = passwordHasher;
        this.sessionOpening = sessionOpening;
        this.anonymousHandover = anonymousHandover;
        this.rateLimiter = rateLimiter;
        this.hashThatMatchesNothing = passwordHasher.hash("no customer has this password");
    }

    public Result<Authentication> execute(Visitor visitor, String typedEmail, String password, String device) {
        Optional<EmailAddress> email = EmailAddress.parse(typedEmail);
        if (email.isEmpty()) {
            return credentialsInvalid();
        }
        if (!rateLimiter.allows("login:" + email.get().value())) {
            return Result.refuse(UserErrorCode.RATE_LIMITED,
                    "Too many attempts in a short time. Wait a moment and try again.");
        }
        return unitOfWork.inTransaction(() -> {
            Optional<Customer> customer = customerRepository.byEmail(email.get());
            String storedHash = customer.map(Customer::passwordHash).orElse(hashThatMatchesNothing);
            boolean passwordFits = passwordHasher.matches(password, storedHash);
            if (customer.isEmpty() || !passwordFits) {
                return credentialsInvalid();
            }
            anonymousHandover.toCustomer(visitor, customer.get().id());
            return Result.of(sessionOpening.openFor(customer.get(),
                    device == null ? visitor.device() : device));
        });
    }

    private Result<Authentication> credentialsInvalid() {
        return Result.refuse(UserErrorCode.CREDENTIALS_INVALID,
                "That email address and password do not go together.");
    }
}
