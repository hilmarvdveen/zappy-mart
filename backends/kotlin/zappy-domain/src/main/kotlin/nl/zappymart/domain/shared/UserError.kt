package nl.zappymart.domain.shared

data class UserError(val code: UserErrorCode, val message: String, val field: String? = null)
