package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "products")
class ProductEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @Column(name = "name", nullable = false)
    var name: String = "",

    @Column(name = "slug", nullable = false, unique = true, length = 191)
    var slug: String = "",

    @Column(name = "description", nullable = false, length = 2000)
    var description: String = "",

    @Column(name = "price_amount", nullable = false)
    var priceAmount: Int = 0,

    @Column(name = "currency", nullable = false, length = 3)
    var currency: String = "EUR",

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "category_id", nullable = false)
    var category: CategoryEntity = CategoryEntity(),

    @Column(name = "stock", nullable = false)
    var stock: Int = 0,

    @Column(name = "image_url")
    var imageUrl: String? = null,

    @Column(name = "catalogue_position", nullable = false)
    var cataloguePosition: Int = 0,
)
