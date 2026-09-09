package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

interface CartRowRepository extends JpaRepository<CartRow, String> {

    Optional<CartRow> findByCustomerId(String customerId);
}
