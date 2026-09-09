package nl.zappymart.application

data class Page<Item>(val items: List<Item>, val hasNextPage: Boolean, val totalCount: Int) {

    companion object {
        const val MAXIMUM_SIZE = 100

        fun sizeAsked(first: Int): Int = first.coerceIn(0, MAXIMUM_SIZE)
    }
}
