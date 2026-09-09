package nl.zappymart.adapters.persistence

import nl.zappymart.adapters.persistence.entities.CartEntity
import nl.zappymart.adapters.persistence.entities.CartLineEntity
import nl.zappymart.application.ports.CartRepository
import nl.zappymart.domain.cart.Cart
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaCartRepository(
    private val carts: CartEntities,
    private val products: ProductEntities,
) : CartRepository {

    override fun findById(cartId: String): Cart? = carts.findById(cartId).orElse(null)?.asCart()

    override fun findByCustomerId(customerId: String): Cart? =
        carts.findByCustomerId(customerId)?.asCart()

    @Transactional
    override fun save(cart: Cart): Cart {
        val entity = carts.findById(cart.id).orElseGet { CartEntity(id = cart.id) }
        entity.customerId = cart.customerId
        entity.promotionCode = cart.promotionCode?.value
        entity.updatedAt = cart.updatedAt
        entity.lines.removeIf { line -> cart.lines.none { wanted -> wanted.id == line.id } }
        cart.lines.forEachIndexed { position, line ->
            val existing = entity.lines.firstOrNull { candidate -> candidate.id == line.id }
            if (existing == null) {
                entity.lines.add(
                    CartLineEntity(
                        id = line.id,
                        cart = entity,
                        product = products.getReferenceById(line.product.id),
                        quantity = line.quantity,
                        position = position,
                    ),
                )
            } else {
                existing.quantity = line.quantity
                existing.position = position
            }
        }
        carts.save(entity)
        return cart
    }

    @Transactional
    override fun delete(cartId: String) {
        carts.findById(cartId).ifPresent { entity -> carts.delete(entity) }
    }
}
