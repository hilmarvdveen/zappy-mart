package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface OrderRowRepository extends JpaRepository<OrderRow, String> {

    List<OrderRow> findByCustomerIdOrderByPlacedAtDescIdDesc(String customerId);

    Optional<OrderRow> findByIdAndCustomerId(String id, String customerId);
}
