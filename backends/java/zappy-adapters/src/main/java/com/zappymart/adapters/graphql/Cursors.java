package com.zappymart.adapters.graphql;

import java.nio.charset.StandardCharsets;
import java.util.Base64;

public final class Cursors {

    private Cursors() {
    }

    public static String encode(String identifier) {
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(identifier.getBytes(StandardCharsets.UTF_8));
    }

    public static String decode(String cursor) {
        if (cursor == null) {
            return null;
        }
        try {
            return new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8);
        } catch (IllegalArgumentException notACursor) {
            return cursor;
        }
    }
}
