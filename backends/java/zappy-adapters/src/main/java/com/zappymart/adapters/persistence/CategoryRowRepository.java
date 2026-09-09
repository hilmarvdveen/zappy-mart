package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface CategoryRowRepository extends JpaRepository<CategoryRow, String> {

    List<CategoryRow> findAllByOrderByPositionAsc();
}
