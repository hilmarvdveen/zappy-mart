package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.time.Instant

@Entity
@Table(name = "customers")
class CustomerEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "email", nullable = false, unique = true, length = 191)
    var email: String = "",

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "password_hash", nullable = false, length = 512)
    var passwordHash: String = "",

    @Column(name = "created_at", nullable = false)
    var createdAt: Instant = Instant.EPOCH,
)
