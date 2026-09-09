package nl.zappymart.application.ports

import java.time.Instant

interface Clock {

    fun moment(): Instant
}
