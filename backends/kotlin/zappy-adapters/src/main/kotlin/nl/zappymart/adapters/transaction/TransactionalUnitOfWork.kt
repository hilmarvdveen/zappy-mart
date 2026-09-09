package nl.zappymart.adapters.transaction

import nl.zappymart.application.ports.UnitOfWork
import org.springframework.stereotype.Component
import org.springframework.transaction.PlatformTransactionManager
import org.springframework.transaction.support.TransactionTemplate

@Component
class TransactionalUnitOfWork(transactionManager: PlatformTransactionManager) : UnitOfWork {

    private val template = TransactionTemplate(transactionManager)

    override fun <Value> execute(work: () -> Value): Value =
        requireNotNull(template.execute { _ -> Outcome(work()) }).value

    private class Outcome<Value>(val value: Value)
}
