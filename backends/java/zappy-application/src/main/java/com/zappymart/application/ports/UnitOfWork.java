package com.zappymart.application.ports;

import java.util.function.Supplier;

public interface UnitOfWork {

    <TValue> TValue inTransaction(Supplier<TValue> work);
}
