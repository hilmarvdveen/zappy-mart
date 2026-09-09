package nl.zappymart.domain.accounts

@JvmInline
value class PasswordHash(val value: String) {

    override fun toString(): String = "PasswordHash(hidden)"
}
