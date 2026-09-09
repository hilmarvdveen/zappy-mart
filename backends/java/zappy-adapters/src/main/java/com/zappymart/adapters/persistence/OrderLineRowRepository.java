package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;

interface OrderLineRowRepository extends JpaRepository<OrderLineRow, String> {

    List<OrderLineRow> findByOrderIdOrderByPositionAsc(String orderId);

    List<OrderLineRow> findByOrderIdInOrderByPositionAsc(Collection<String> orderIds);
}
