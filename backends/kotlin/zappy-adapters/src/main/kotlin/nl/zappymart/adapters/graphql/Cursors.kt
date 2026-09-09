package nl.zappymart.adapters.graphql

import java.util.Base64

object Cursors {

    fun of(id: String): String = Base64.getUrlEncoder().withoutPadding().encodeToString(id.toByteArray())

    fun idOf(cursor: String?): String? {
        if (cursor.isNullOrBlank()) {
            return null
        }
        return try {
            String(Base64.getUrlDecoder().decode(cursor))
        } catch (malformed: IllegalArgumentException) {
            null
        }
    }
}
