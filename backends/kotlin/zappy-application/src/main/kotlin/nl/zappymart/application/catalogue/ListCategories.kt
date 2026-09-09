package nl.zappymart.application.catalogue

import nl.zappymart.application.ports.CategoryRepository
import nl.zappymart.domain.catalogue.Category

class ListCategories(private val categories: CategoryRepository) {

    fun execute(): List<Category> = categories.findAll()
}
