package nl.zappymart.adapters.graphql

import graphql.ExecutionResultImpl
import graphql.GraphqlErrorBuilder
import graphql.language.OperationDefinition
import graphql.parser.Parser
import nl.zappymart.application.accounts.IdentifyVisitor
import org.springframework.graphql.execution.ErrorType
import org.springframework.graphql.server.WebGraphQlInterceptor
import org.springframework.graphql.server.WebGraphQlRequest
import org.springframework.graphql.server.WebGraphQlResponse
import org.springframework.graphql.support.DefaultExecutionGraphQlResponse
import org.springframework.http.HttpHeaders
import org.springframework.stereotype.Component
import reactor.core.publisher.Mono

@Component
class RequestContextInterceptor(
    private val identifyVisitor: IdentifyVisitor,
    private val properties: SecurityProperties,
) : WebGraphQlInterceptor {

    private val cookies = Cookies(properties)

    override fun intercept(request: WebGraphQlRequest, chain: WebGraphQlInterceptor.Chain): Mono<WebGraphQlResponse> {
        if (changesSomething(request) && !comesFromAnAllowedOrigin(request)) {
            return Mono.just(refuseTheOrigin(request))
        }
        val context = RequestContext(
            startingVisitor = identifyVisitor.execute(bearerTokenOf(request), cookieValueOf(request, Cookies.CART_NAME)),
            presentedRefreshToken = cookieValueOf(request, Cookies.REFRESH_TOKEN_NAME),
            device = request.headers.getFirst(HttpHeaders.USER_AGENT) ?: "An unnamed device",
            cookies = cookies,
        )
        request.configureExecutionInput { _, builder ->
            builder.graphQLContext { holder -> holder.put(RequestContext.KEY, context) }.build()
        }
        return chain.next(request).doOnNext { response ->
            context.cookiesToSet().forEach { cookie -> response.responseHeaders.add(HttpHeaders.SET_COOKIE, cookie) }
        }
    }

    private fun changesSomething(request: WebGraphQlRequest): Boolean = try {
        Parser.parse(request.document)
            .getDefinitionsOfType(OperationDefinition::class.java)
            .filter { definition -> request.operationName == null || definition.name == request.operationName }
            .any { definition -> definition.operation == OperationDefinition.Operation.MUTATION }
    } catch (malformed: RuntimeException) {
        false
    }

    private fun comesFromAnAllowedOrigin(request: WebGraphQlRequest): Boolean {
        val origin = request.headers.getFirst(HttpHeaders.ORIGIN) ?: return false
        return properties.allowedOrigins.contains(origin)
    }

    private fun refuseTheOrigin(request: WebGraphQlRequest): WebGraphQlResponse {
        val error = GraphqlErrorBuilder.newError()
            .message("A mutation needs an allowed Origin header. See docs/security.md.")
            .errorType(ErrorType.FORBIDDEN)
            .build()
        val result = ExecutionResultImpl.newExecutionResult().addError(error).build()
        return WebGraphQlResponse(DefaultExecutionGraphQlResponse(request.toExecutionInput(), result))
    }

    private fun bearerTokenOf(request: WebGraphQlRequest): String? =
        request.headers.getFirst(HttpHeaders.AUTHORIZATION)
            ?.takeIf { header -> header.startsWith(BEARER_PREFIX, ignoreCase = true) }
            ?.substring(BEARER_PREFIX.length)
            ?.trim()

    private fun cookieValueOf(request: WebGraphQlRequest, name: String): String? =
        request.cookies.getFirst(name)?.value?.takeIf { value -> value.isNotBlank() }

    private companion object {
        const val BEARER_PREFIX = "Bearer "
    }
}
