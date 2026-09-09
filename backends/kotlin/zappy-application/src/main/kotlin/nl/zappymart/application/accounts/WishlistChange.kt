package nl.zappymart.application.accounts

import nl.zappymart.domain.catalogue.Product
import nl.zappymart.domain.shared.UserError

data class WishlistChange(val products: List<Product>, val anonymousCartId: String?, val errors: List<UserError>)
