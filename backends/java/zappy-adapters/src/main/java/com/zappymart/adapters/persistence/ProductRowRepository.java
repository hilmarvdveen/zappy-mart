package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

interface ProductRowRepository extends JpaRepository<ProductRow, String> {

    List<ProductRow> findAllByOrderByPositionAsc();

    Optional<ProductRow> findBySlug(String slug);

    List<ProductRow> findAllByIdIn(Collection<String> ids);
}
