package com.zappymart.domain.shared;

import java.util.List;
import java.util.Optional;
import java.util.function.Function;
import java.util.function.Supplier;

public sealed interface Result<TValue> {

    record Success<TValue>(TValue value) implements Result<TValue> {
    }

    record Refusal<TValue>(List<UserError> errors) implements Result<TValue> {
        public Refusal {
            errors = List.copyOf(errors);
            if (errors.isEmpty()) {
                throw new IllegalArgumentException("A refusal names at least one reason");
            }
        }
    }

    static <TValue> Result<TValue> of(TValue value) {
        return new Success<>(value);
    }

    static <TValue> Result<TValue> refuse(UserError error) {
        return new Refusal<>(List.of(error));
    }

    static <TValue> Result<TValue> refuse(UserErrorCode code, String message) {
        return refuse(UserError.of(code, message));
    }

    static <TValue> Result<TValue> refuse(UserErrorCode code, String message, String field) {
        return refuse(UserError.onField(code, message, field));
    }

    default boolean succeeded() {
        return this instanceof Success<TValue>;
    }

    default Optional<TValue> asOptional() {
        return this instanceof Success<TValue> success ? Optional.of(success.value()) : Optional.empty();
    }

    default List<UserError> errors() {
        return this instanceof Refusal<TValue> refusal ? refusal.errors() : List.of();
    }

    default TValue orElse(TValue fallback) {
        return this instanceof Success<TValue> success ? success.value() : fallback;
    }

    default TValue orElseGet(Supplier<TValue> fallback) {
        return this instanceof Success<TValue> success ? success.value() : fallback.get();
    }

    default TValue valueOrThrow() {
        return switch (this) {
            case Success<TValue> success -> success.value();
            case Refusal<TValue> refusal ->
                    throw new IllegalStateException("A refusal carries no value: " + refusal.errors());
        };
    }

    default <TOther> Result<TOther> map(Function<TValue, TOther> transformation) {
        return switch (this) {
            case Success<TValue> success -> new Success<>(transformation.apply(success.value()));
            case Refusal<TValue> refusal -> new Refusal<>(refusal.errors());
        };
    }

    default <TOther> Result<TOther> carryRefusal() {
        return switch (this) {
            case Success<TValue> ignored -> throw new IllegalStateException("A success carries no refusal");
            case Refusal<TValue> refusal -> new Refusal<>(refusal.errors());
        };
    }
}
