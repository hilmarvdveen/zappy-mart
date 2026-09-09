package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.Id
import jakarta.persistence.Table

@Entity
@Table(name = "categories")
class CategoryEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "slug", nullable = false, unique = true, length = 128)
    var slug: String = "",

    @Column(name = "position", nullable = false)
    var position: Int = 0,
)
