package nl.zappymart.application.accounts

import nl.zappymart.application.Visitor
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.domain.accounts.Customer

class FindSignedInCustomer(private val customers: CustomerRepository) {

    fun execute(visitor: Visitor): Customer? = visitor.customerId?.let { id -> customers.findById(id) }
}
