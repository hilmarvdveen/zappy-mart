package nl.zappymart.application.ports

import nl.zappymart.domain.catalogue.Category

interface CategoryRepository {

    fun findAll(): List<Category>
}
