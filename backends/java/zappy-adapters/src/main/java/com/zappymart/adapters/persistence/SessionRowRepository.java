package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface SessionRowRepository extends JpaRepository<SessionRow, String> {

    List<SessionRow> findByCustomerIdOrderByCreatedAtDesc(String customerId);
}
