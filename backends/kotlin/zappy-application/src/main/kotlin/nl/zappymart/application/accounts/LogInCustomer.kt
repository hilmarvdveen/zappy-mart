package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.cart.VisitorCart
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.application.ports.PasswordHasher
import nl.zappymart.application.ports.RateLimiter
import nl.zappymart.application.ports.UnitOfWork
import nl.zappymart.domain.accounts.PasswordHash
import nl.zappymart.domain.shared.EmailAddress
import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

data class LoginRequest(val email: String, val password: String, val device: String)

class LogInCustomer(
    private val customers: CustomerRepository,
    private val passwords: PasswordHasher,
    private val signIn: SignIn,
    private val visitorCart: VisitorCart,
    private val wishlistOwner: WishlistOwner,
    private val rateLimiter: RateLimiter,
    private val unitOfWork: UnitOfWork,
) {

    private val hashThatMatchesNobody: PasswordHash by lazy {
        passwords.hash("a password that belongs to no customer at all")
    }

    fun execute(visitor: Visitor, request: LoginRequest): Result<Authentication> {
        val address = request.email.trim().lowercase()
        if (!rateLimiter.allows("login:$address")) {
            return refusal(UserErrorCode.RATE_LIMITED, "Too many attempts. Please wait and try again.")
        }
        return unitOfWork.execute {
            val customer = EmailAddress.of(address).let { parsed ->
                if (parsed is Result.Success) customers.findByEmail(parsed.value) else null
            }
            val hash = customer?.passwordHash ?: hashThatMatchesNobody
            val matches = passwords.matches(request.password, hash)
            if (customer == null || !matches) {
                refusal(
                    UserErrorCode.CREDENTIALS_INVALID,
                    "That email address and password do not match a customer.",
                )
            } else {
                wishlistOwner.moveToCustomer(visitor, customer.id)
                visitorCart.moveToCustomer(visitor, customer.id)
                Result.Success(signIn.start(customer, request.device))
            }
        }
    }
}
