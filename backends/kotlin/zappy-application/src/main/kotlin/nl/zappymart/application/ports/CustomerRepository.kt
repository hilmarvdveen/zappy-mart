package nl.zappymart.application.ports

import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.shared.EmailAddress

interface CustomerRepository {

    fun findById(customerId: String): Customer?

    fun findByEmail(email: EmailAddress): Customer?

    fun save(customer: Customer): Customer
}
