package nl.zappymart.application.accounts

import nl.zappymart.application.ports.Clock
import nl.zappymart.application.ports.SessionRepository
import nl.zappymart.domain.accounts.Session

class ListSessions(
    private val sessions: SessionRepository,
    private val clock: Clock,
) {

    fun execute(customerId: String): List<Session> = sessions.findOpenForCustomer(customerId, clock.moment())
}
