package nl.zappymart.domain.catalogue

import nl.zappymart.domain.builders.aProduct
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test

class ProductSpecificationTest {

    private val ring = aProduct().named("Princess ring").inCategory("jewellery").withStock(0).build()

    private val jacket = aProduct().named("Cotton jacket").inCategory("mens-clothing").withStock(8).build()

    @Test
    fun `an empty specification keeps every product`() {
        assertThat(ProductSpecification.EVERYTHING.isSatisfiedBy(ring)).isTrue()
        assertThat(ProductSpecification.EVERYTHING.isSatisfiedBy(jacket)).isTrue()
    }

    @Test
    fun `a category filter keeps only that category`() {
        val specification = ProductSpecification.of("jewellery", null, null)
        assertThat(specification.isSatisfiedBy(ring)).isTrue()
        assertThat(specification.isSatisfiedBy(jacket)).isFalse()
    }

    @Test
    fun `a name filter ignores case`() {
        val specification = ProductSpecification.of(null, "COTTON", null)
        assertThat(specification.isSatisfiedBy(jacket)).isTrue()
        assertThat(specification.isSatisfiedBy(ring)).isFalse()
    }

    @Test
    fun `the in stock filter leaves out what has none`() {
        val specification = ProductSpecification.of(null, null, true)
        assertThat(specification.isSatisfiedBy(ring)).isFalse()
        assertThat(specification.isSatisfiedBy(jacket)).isTrue()
    }

    @Test
    fun `every part that is given has to hold`() {
        val specification = ProductSpecification.of("mens-clothing", "jacket", true)
        assertThat(specification.isSatisfiedBy(jacket)).isTrue()
        assertThat(ProductSpecification.of("jewellery", "jacket", true).isSatisfiedBy(jacket)).isFalse()
    }

    @Test
    fun `a blank name filter is left out`() {
        assertThat(ProductSpecification.of(null, "   ", null)).isEqualTo(ProductSpecification.EVERYTHING)
    }
}
