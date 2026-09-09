package com.zappymart.domain.shared;

import java.util.Locale;
import java.util.Optional;
import java.util.regex.Pattern;

public record EmailAddress(String value) {

    private static final Pattern SHAPE = Pattern.compile("^[^@\\s]+@[^@\\s.]+(\\.[^@\\s.]+)+$");

    public EmailAddress {
        if (value == null || !SHAPE.matcher(value).matches()) {
            throw new IllegalArgumentException("An email address has a local part, an at sign and a domain");
        }
    }

    public static Optional<EmailAddress> parse(String text) {
        if (text == null) {
            return Optional.empty();
        }
        String normalised = text.trim().toLowerCase(Locale.ROOT);
        if (!SHAPE.matcher(normalised).matches()) {
            return Optional.empty();
        }
        return Optional.of(new EmailAddress(normalised));
    }

    @Override
    public String toString() {
        return value;
    }
}
