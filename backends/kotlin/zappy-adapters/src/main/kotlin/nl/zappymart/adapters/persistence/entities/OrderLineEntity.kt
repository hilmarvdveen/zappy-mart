package nl.zappymart.adapters.persistence.entities

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table

@Entity
@Table(name = "order_lines")
class OrderLineEntity(

    @Id
    @GeneratedValue(strategy = GenerationType.SEQUENCE)
    @Column(name = "id")
    var id: Long? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    var order: OrderEntity? = null,

    @Column(name = "product_id", nullable = false, length = 64)
    var productId: String = "",

    @Column(name = "product_name", nullable = false)
    var productName: String = "",

    @Column(name = "unit_price", nullable = false)
    var unitPrice: Int = 0,

    @Column(name = "currency", nullable = false, length = 3)
    var currency: String = "EUR",

    @Column(name = "quantity", nullable = false)
    var quantity: Int = 1,

    @Column(name = "position", nullable = false)
    var position: Int = 0,
)
