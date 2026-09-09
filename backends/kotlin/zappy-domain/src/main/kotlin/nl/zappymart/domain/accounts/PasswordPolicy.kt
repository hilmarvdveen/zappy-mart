package nl.zappymart.domain.accounts

import nl.zappymart.domain.shared.Result
import nl.zappymart.domain.shared.UserErrorCode
import nl.zappymart.domain.shared.refusal

object PasswordPolicy {

    const val MINIMUM_LENGTH = 12

    const val MAXIMUM_LENGTH = 128

    fun check(password: String): Result<Unit> = when {
        password.length < MINIMUM_LENGTH -> refusal(
            UserErrorCode.PASSWORD_TOO_SHORT,
            "A password is at least $MINIMUM_LENGTH characters long.",
            "input.password",
        )

        password.length > MAXIMUM_LENGTH -> refusal(
            UserErrorCode.PASSWORD_TOO_LONG,
            "A password is at most $MAXIMUM_LENGTH characters long.",
            "input.password",
        )

        else -> Result.Success(Unit)
    }
}
