package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

interface CustomerRowRepository extends JpaRepository<CustomerRow, String> {

    Optional<CustomerRow> findByEmail(String email);
}
