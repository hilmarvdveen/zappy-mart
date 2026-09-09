package nl.zappymart.domain.shared

sealed interface Result<out Value> {

    data class Success<Value>(val value: Value) : Result<Value>

    data class Refused(val errors: List<UserError>) : Result<Nothing>
}

fun refusal(code: UserErrorCode, message: String, field: String? = null): Result.Refused =
    Result.Refused(listOf(UserError(code, message, field)))

fun <Value> succeed(value: Value): Result<Value> = Result.Success(value)

inline fun <Value, Other> Result<Value>.map(transform: (Value) -> Other): Result<Other> =
    when (this) {
        is Result.Success -> Result.Success(transform(value))
        is Result.Refused -> this
    }

inline fun <Value, Other> Result<Value>.andThen(next: (Value) -> Result<Other>): Result<Other> =
    when (this) {
        is Result.Success -> next(value)
        is Result.Refused -> this
    }

fun <Value> Result<Value>.valueOrNull(): Value? =
    when (this) {
        is Result.Success -> value
        is Result.Refused -> null
    }

fun <Value> Result<Value>.errors(): List<UserError> =
    when (this) {
        is Result.Success -> emptyList()
        is Result.Refused -> errors
    }
