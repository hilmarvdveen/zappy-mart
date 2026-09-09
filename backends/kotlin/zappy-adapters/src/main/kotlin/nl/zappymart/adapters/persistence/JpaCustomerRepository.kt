package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.CustomerEntity
import nl.zappymart.application.ports.CustomerRepository
import nl.zappymart.domain.accounts.Customer
import nl.zappymart.domain.shared.EmailAddress
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaCustomerRepository(private val customers: CustomerEntities) : CustomerRepository {

    override fun findById(customerId: String): Customer? =
        customers.findById(customerId).orElse(null)?.asCustomer()

    override fun findByEmail(email: EmailAddress): Customer? =
        customers.findByEmail(email.value)?.asCustomer()

    @Transactional
    override fun save(customer: Customer): Customer {
        val entity = customers.findById(customer.id).orElseGet { CustomerEntity(id = customer.id) }
        entity.email = customer.email.value
        entity.name = customer.name
        entity.passwordHash = customer.passwordHash.value
        entity.createdAt = customer.createdAt
        return customers.save(entity).asCustomer()
    }
}
