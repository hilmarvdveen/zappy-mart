package com.zappymart.adapters.runtime;

import com.zappymart.application.ports.UnitOfWork;
import org.springframework.transaction.support.TransactionTemplate;

import java.util.function.Supplier;

public final class TransactionalUnitOfWork implements UnitOfWork {

    private final TransactionTemplate transactionTemplate;

    public TransactionalUnitOfWork(TransactionTemplate transactionTemplate) {
        this.transactionTemplate = transactionTemplate;
    }

    @Override
    public <TValue> TValue inTransaction(Supplier<TValue> work) {
        return transactionTemplate.execute(status -> work.get());
    }
}
