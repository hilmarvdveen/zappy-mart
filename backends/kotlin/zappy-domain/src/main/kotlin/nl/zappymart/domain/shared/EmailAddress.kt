package nl.zappymart.domain.shared

@JvmInline
value class EmailAddress private constructor(val value: String) {

    override fun toString(): String = value

    companion object {
        private val SHAPE = Regex("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$")

        fun of(text: String): Result<EmailAddress> {
            val normalised = text.trim().lowercase()
            return if (SHAPE.matches(normalised)) {
                Result.Success(EmailAddress(normalised))
            } else {
                refusal(UserErrorCode.EMAIL_INVALID, "That is not an email address.", "input.email")
            }
        }

        fun ofStored(value: String) = EmailAddress(value)
    }
}
