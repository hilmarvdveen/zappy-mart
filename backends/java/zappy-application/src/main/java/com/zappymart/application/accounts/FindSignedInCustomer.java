package com.zappymart.application.accounts;

import com.zappymart.application.Visitor;
import com.zappymart.application.ports.CustomerRepository;
import com.zappymart.domain.accounts.Customer;

import java.util.Optional;

public final class FindSignedInCustomer {

    private final CustomerRepository customerRepository;

    public FindSignedInCustomer(CustomerRepository customerRepository) {
        this.customerRepository = customerRepository;
    }

    public Optional<Customer> execute(Visitor visitor) {
        if (!visitor.isSignedIn()) {
            return Optional.empty();
        }
        return customerRepository.byId(visitor.customerId());
    }
}
