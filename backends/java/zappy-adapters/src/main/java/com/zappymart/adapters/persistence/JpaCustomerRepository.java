package com.zappymart.adapters.persistence;

import com.zappymart.application.ports.CustomerRepository;
import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.shared.EmailAddress;

import java.util.Optional;

public final class JpaCustomerRepository implements CustomerRepository {

    private final CustomerRowRepository customerRows;

    JpaCustomerRepository(CustomerRowRepository customerRows) {
        this.customerRows = customerRows;
    }

    @Override
    public Optional<Customer> byId(String customerId) {
        return customerRows.findById(customerId).map(JpaCustomerRepository::customerOf);
    }

    @Override
    public Optional<Customer> byEmail(EmailAddress email) {
        return customerRows.findByEmail(email.value()).map(JpaCustomerRepository::customerOf);
    }

    @Override
    public Customer save(Customer customer) {
        customerRows.save(new CustomerRow(customer.id(), customer.email().value(), customer.name(),
                customer.passwordHash(), customer.createdAt()));
        return customer;
    }

    private static Customer customerOf(CustomerRow row) {
        return new Customer(row.id, new EmailAddress(row.email), row.name, row.passwordHash, row.createdAt);
    }
}
