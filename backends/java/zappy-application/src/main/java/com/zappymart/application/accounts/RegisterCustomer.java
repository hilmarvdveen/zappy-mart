package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.Clock;
import com.zappymart.application.ports.CustomerRepository;
import com.zappymart.application.ports.IdentifierGenerator;
import com.zappymart.application.ports.PasswordHasher;
import com.zappymart.application.ports.RateLimiter;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.accounts.PasswordPolicy;
import com.zappymart.domain.shared.EmailAddress;
import com.zappymart.domain.shared.Result;
import com.zappymart.domain.shared.UserErrorCode;

import java.util.Optional;

public final class RegisterCustomer {

    private final UnitOfWork unitOfWork;
    private final CustomerRepository customerRepository;
    private final PasswordHasher passwordHasher;
    private final SessionOpening sessionOpening;
    private final AnonymousHandover anonymousHandover;
    private final RateLimiter rateLimiter;
    private final IdentifierGenerator identifierGenerator;
    private final Clock clock;

    public RegisterCustomer(UnitOfWork unitOfWork, CustomerRepository customerRepository,
                            PasswordHasher passwordHasher, SessionOpening sessionOpening,
                            AnonymousHandover anonymousHandover, RateLimiter rateLimiter,
                            IdentifierGenerator identifierGenerator, Clock clock) {
        this.unitOfWork = unitOfWork;
        this.customerRepository = customerRepository;
        this.passwordHasher = passwordHasher;
        this.sessionOpening = sessionOpening;
        this.anonymousHandover = anonymousHandover;
        this.rateLimiter = rateLimiter;
        this.identifierGenerator = identifierGenerator;
        this.clock = clock;
    }

    public Result<Authentication> execute(Visitor visitor, String typedEmail, String name, String password) {
        Optional<EmailAddress> email = EmailAddress.parse(typedEmail);
        if (email.isEmpty()) {
            return Result.refuse(UserErrorCode.EMAIL_INVALID,
                    "That is not an email address.", "input.email");
        }
        if (!rateLimiter.allows("register:" + email.get().value())) {
            return Result.refuse(UserErrorCode.RATE_LIMITED,
                    "Too many attempts in a short time. Wait a moment and try again.");
        }
        Result<String> checkedPassword = PasswordPolicy.check(password);
        if (!checkedPassword.succeeded()) {
            return checkedPassword.carryRefusal();
        }
        return unitOfWork.inTransaction(() -> {
            if (customerRepository.byEmail(email.get()).isPresent()) {
                return Result.refuse(UserErrorCode.EMAIL_TAKEN,
                        "A customer with that email address is already registered.", "input.email");
            }
            Customer customer = customerRepository.save(new Customer(identifierGenerator.next(), email.get(),
                    name, passwordHasher.hash(password), clock.now()));
            anonymousHandover.toCustomer(visitor, customer.id());
            return Result.of(sessionOpening.openFor(customer, visitor.device()));
        });
    }
}
