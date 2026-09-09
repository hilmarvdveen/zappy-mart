package nl.zappymart.application.ports

interface UnitOfWork {

    fun <Value> execute(work: () -> Value): Value
}
