package nl.zappymart.adapters.graphql

import nl.zappymart.application.accounts.Authentication
import nl.zappymart.application.accounts.FindSignedInCustomer
import nl.zappymart.application.accounts.ListSessions
import nl.zappymart.application.accounts.LogInCustomer
import nl.zappymart.application.accounts.LogOut
import nl.zappymart.application.accounts.LoginRequest
import nl.zappymart.application.accounts.RefreshSession
import nl.zappymart.application.accounts.RegisterCustomer
import nl.zappymart.application.accounts.RegistrationRequest
import nl.zappymart.application.accounts.RevokeSession
import nl.zappymart.application.accounts.ViewWishlist
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.accounts.Session
import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.Result
import org.springframework.graphql.data.method.annotation.Argument
import org.springframework.graphql.data.method.annotation.ContextValue
import org.springframework.graphql.data.method.annotation.MutationMapping
import org.springframework.graphql.data.method.annotation.QueryMapping
import org.springframework.graphql.data.method.annotation.SchemaMapping
import org.springframework.stereotype.Controller

@Controller
class AccountController(
    private val registerCustomer: RegisterCustomer,
    private val logInCustomer: LogInCustomer,
    private val refreshSession: RefreshSession,
    private val logOut: LogOut,
    private val revokeSession: RevokeSession,
    private val findSignedInCustomer: FindSignedInCustomer,
    private val listSessions: ListSessions,
    private val viewWishlist: ViewWishlist,
) {

    @QueryMapping
    fun me(@ContextValue requestContext: RequestContext): Customer? =
        findSignedInCustomer.execute(requestContext.visitor)

    @MutationMapping
    fun register(
        @ContextValue requestContext: RequestContext,
        @Argument input: RegisterInput,
    ): AuthenticationPayload = answer(
        requestContext,
        registerCustomer.execute(
            requestContext.visitor,
            RegistrationRequest(input.email, input.name, input.password, requestContext.device),
        ),
    )

    @MutationMapping
    fun login(
        @ContextValue requestContext: RequestContext,
        @Argument input: LoginInput,
    ): AuthenticationPayload = answer(
        requestContext,
        logInCustomer.execute(
            requestContext.visitor,
            LoginRequest(input.email, input.password, input.device ?: requestContext.device),
        ),
    )

    @MutationMapping
    fun refreshSession(@ContextValue requestContext: RequestContext): AuthenticationPayload =
        answer(requestContext, refreshSession.execute(requestContext.presentedRefreshToken))

    @MutationMapping
    fun logout(@ContextValue requestContext: RequestContext): LogoutPayload {
        val success = logOut.execute(requestContext.visitor, requestContext.presentedRefreshToken)
        requestContext.signedOut()
        return LogoutPayload(success, emptyList())
    }

    @MutationMapping
    fun revokeSession(
        @ContextValue requestContext: RequestContext,
        @Argument sessionId: String,
    ): RevokeSessionPayload = when (val outcome = revokeSession.execute(requestContext.visitor, sessionId)) {
        is Result.Success -> RevokeSessionPayload(outcome.value, emptyList())
        is Result.Refused -> RevokeSessionPayload(emptyList(), outcome.errors)
    }

    @SchemaMapping(typeName = "Customer", field = "email")
    fun customerEmail(customer: Customer): String = customer.email.value

    @SchemaMapping(typeName = "Customer", field = "sessions")
    fun customerSessions(customer: Customer): List<Session> = listSessions.execute(customer.id)

    @SchemaMapping(typeName = "Customer", field = "wishlist")
    fun customerWishlist(
        customer: Customer,
        @ContextValue requestContext: RequestContext,
    ): List<Product> = viewWishlist.execute(requestContext.visitor)

    @SchemaMapping(typeName = "Session", field = "current")
    fun sessionIsCurrent(session: Session, @ContextValue requestContext: RequestContext): Boolean =
        session.id == requestContext.visitor.sessionId

    private fun answer(requestContext: RequestContext, outcome: Result<Authentication>): AuthenticationPayload =
        when (outcome) {
            is Result.Success -> {
                val authentication = outcome.value
                requestContext.signedIn(
                    authentication.customer.id,
                    authentication.sessionId,
                    authentication.refreshToken,
                )
                AuthenticationPayload(
                    authentication.customer,
                    authentication.accessToken.value,
                    authentication.accessToken.expiresAt,
                    emptyList(),
                )
            }

            is Result.Refused -> AuthenticationPayload(null, null, null, outcome.errors)
        }
}
