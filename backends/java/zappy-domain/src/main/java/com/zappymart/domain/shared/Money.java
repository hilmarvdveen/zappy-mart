package com.zappymart.domain.shared;

import java.util.Objects;

public record Money(int amount, String currency) {

    public static final String EURO = "EUR";

    public Money {
        Objects.requireNonNull(currency, "currency");
        if (amount < 0) {
            throw new IllegalArgumentException("An amount of money is never negative: " + amount);
        }
        if (currency.isBlank()) {
            throw new IllegalArgumentException("A currency code is never blank");
        }
    }

    public static Money euro(int amount) {
        return new Money(amount, EURO);
    }

    public static Money zero() {
        return euro(0);
    }

    public Money plus(Money other) {
        requireSameCurrency(other);
        return new Money(amount + other.amount, currency);
    }

    public Money minus(Money other) {
        requireSameCurrency(other);
        return new Money(amount - other.amount, currency);
    }

    public Money times(int factor) {
        if (factor < 0) {
            throw new IllegalArgumentException("An amount of money is never multiplied by a negative factor: " + factor);
        }
        return new Money(amount * factor, currency);
    }

    public Money percentageRoundedHalfUp(int percentage) {
        if (percentage < 0 || percentage > 100) {
            throw new IllegalArgumentException("A percentage lies between 0 and 100: " + percentage);
        }
        return new Money((amount * percentage + 50) / 100, currency);
    }

    public Money cappedAt(Money ceiling) {
        requireSameCurrency(ceiling);
        return amount <= ceiling.amount ? this : ceiling;
    }

    public boolean isAtLeast(Money other) {
        requireSameCurrency(other);
        return amount >= other.amount;
    }

    public boolean isLessThan(Money other) {
        return !isAtLeast(other);
    }

    public boolean isZero() {
        return amount == 0;
    }

    private void requireSameCurrency(Money other) {
        Objects.requireNonNull(other, "other");
        if (!currency.equals(other.currency)) {
            throw new IllegalArgumentException(
                    "Two amounts in different currencies do not meet: " + currency + " and " + other.currency);
        }
    }
}
