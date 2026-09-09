package com.zappymart.adapters.persistence;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

interface RefreshTokenRowRepository extends JpaRepository<RefreshTokenRow, String> {

    Optional<RefreshTokenRow> findByTokenHash(String tokenHash);

    List<RefreshTokenRow> findBySessionId(String sessionId);
}
