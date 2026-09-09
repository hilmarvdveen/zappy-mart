package nl.zappymart.domain.shared

@JvmInline
value class PromotionCode private constructor(val value: String) {

    override fun toString(): String = value

    companion object {
        fun of(text: String) = PromotionCode(text.trim().uppercase())
    }
}
