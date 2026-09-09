package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface CartLineRowRepository extends JpaRepository<CartLineRow, String> {

    List<CartLineRow> findByCartIdOrderByPositionAsc(String cartId);

    void deleteByCartId(String cartId);
}
