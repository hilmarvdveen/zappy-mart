package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.IdentifierFactory
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.application.ports.RateLimiter
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.PasswordPolicy
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class RegistrationRequest(val email: String, val name: String, val password: String, val device: String)

class RegisterCustomer(
    private val customers: CustomerRepository,
    private val passwords: PasswordHasher,
    private val identifiers: IdentifierFactory,
    private val clock: Clock,
    private val signIn: SignIn,
    private val visitorCart: VisitorCart,
    private val wishlistOwner: WishlistOwner,
    private val rateLimiter: RateLimiter,
    private val unitOfWork: UnitOfWork,
) {

    fun execute(visitor: Visitor, request: RegistrationRequest): Result<Authentication> {
        if (!rateLimiter.allows("register:${request.email.trim().lowercase()}")) {
            return refusal(UserErrorCode.RATE_LIMITED, "Too many attempts. Please wait and try again.")
        }
        val email = when (val parsed = EmailAddress.of(request.email)) {
            is Result.Refused -> return parsed
            is Result.Success -> parsed.value
        }
        val policy = PasswordPolicy.check(request.password)
        if (policy is Result.Refused) {
            return policy
        }
        return unitOfWork.execute {
            if (customers.findByEmail(email) != null) {
                refusal(UserErrorCode.EMAIL_TAKEN, "That email address is already registered.", "input.email")
            } else {
                val customer = customers.save(
                    Customer(
                        id = identifiers.next(),
                        email = email,
                        name = request.name.trim(),
                        passwordHash = passwords.hash(request.password),
                        createdAt = clock.moment(),
                    ),
                )
                wishlistOwner.moveToCustomer(visitor, customer.id)
                visitorCart.moveToCustomer(visitor, customer.id)
                Result.Success(signIn.start(customer, request.device))
            }
        }
    }
}
