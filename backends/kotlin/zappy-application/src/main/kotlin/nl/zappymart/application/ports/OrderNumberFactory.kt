package nl.zappymart.application.ports

import java.time.Instant

interface OrderNumberFactory {

    fun next(moment: Instant): String
}
