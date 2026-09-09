package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

interface WishlistEntryRowRepository extends JpaRepository<WishlistEntryRow, String> {

    List<WishlistEntryRow> findByOwnerIdOrderByPositionAsc(String ownerId);

    void deleteByOwnerId(String ownerId);
}
