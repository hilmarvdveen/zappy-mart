package com.zappymart.application.ports;

import com.zappymart.domain.accounts.Customer;
import com.zappymart.domain.shared.EmailAddress;

import java.util.Optional;

public interface CustomerRepository {

    Optional<Customer> byId(String customerId);

    Optional<Customer> byEmail(EmailAddress email);

    Customer save(Customer customer);
}
