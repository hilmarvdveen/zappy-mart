package nl.zappymart.adapters.persistence

import nl.zappymart.application.ports.CategoryRepository
import nl.zappymart.domain.catalogue.Category
import org.springframework.stereotype.Repository
import org.springframework.transaction.annotation.Transactional

@Repository
@Transactional(readOnly = true)
class JpaCategoryRepository(private val categories: CategoryEntities) : CategoryRepository {

    override fun findAll(): List<Category> =
        categories.findAllByOrderByPositionAsc().map { entity -> entity.asCategory() }
}
