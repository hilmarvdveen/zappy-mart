package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "cart_lines")
class CartLineEntity(

    @Id
    @Column(name = "id", length = 64)
    var id: String = "",

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cart_id", nullable = false)
    var cart: CartEntity? = null,

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    var product: ProductEntity = ProductEntity(),

    @Column(name = "quantity", nullable = false)
    var quantity: Int = 1,

    @Column(name = "position", nullable = false)
    var position: Int = 0,
)
