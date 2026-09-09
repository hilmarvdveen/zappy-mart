package com.zappymart.adapters.graphql;

import graphql.ExecutionResult;
import graphql.ExecutionResultImpl;
import graphql.GraphQLError;
import graphql.GraphqlErrorBuilder;
import graphql.language.Document;
import graphql.language.OperationDefinition;
import graphql.parser.InvalidSyntaxException;
import graphql.parser.Parser;
import org.springframework.graphql.execution.ErrorType;
import org.springframework.graphql.server.WebGraphQlInterceptor;
import org.springframework.graphql.server.WebGraphQlRequest;
import org.springframework.graphql.server.WebGraphQlResponse;
import org.springframework.graphql.support.DefaultExecutionGraphQlResponse;
import org.springframework.http.HttpHeaders;
import reactor.core.publisher.Mono;

import java.util.List;

public final class OriginCheckInterceptor implements WebGraphQlInterceptor {

    private final SecuritySettings securitySettings;

    public OriginCheckInterceptor(SecuritySettings securitySettings) {
        this.securitySettings = securitySettings;
    }

    @Override
    public Mono<WebGraphQlResponse> intercept(WebGraphQlRequest request, Chain chain) {
        if (!changesSomething(request) || securitySettings.allows(request.getHeaders().getFirst(HttpHeaders.ORIGIN))) {
            return chain.next(request);
        }
        return Mono.just(refusal(request));
    }

    private static boolean changesSomething(WebGraphQlRequest request) {
        try {
            Document document = Parser.parse(request.getDocument());
            List<OperationDefinition> operations = document.getDefinitionsOfType(OperationDefinition.class);
            return operations.stream()
                    .filter(operation -> matchesRequestedOperation(operation, request.getOperationName()))
                    .anyMatch(operation -> operation.getOperation() == OperationDefinition.Operation.MUTATION);
        } catch (InvalidSyntaxException unparsable) {
            return false;
        }
    }

    private static boolean matchesRequestedOperation(OperationDefinition operation, String requestedName) {
        return requestedName == null || requestedName.equals(operation.getName());
    }

    private static WebGraphQlResponse refusal(WebGraphQlRequest request) {
        GraphQLError error = GraphqlErrorBuilder.newError()
                .errorType(ErrorType.FORBIDDEN)
                .message("A mutation needs an Origin header that this store allows.")
                .build();
        ExecutionResult result = ExecutionResultImpl.newExecutionResult().addError(error).build();
        return new WebGraphQlResponse(new DefaultExecutionGraphQlResponse(request.toExecutionInput(), result));
    }
}
