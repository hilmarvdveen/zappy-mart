package com.zappymart.domain.catalogue;

import java.util.Objects;

public record Category(String id, String name, String slug) {

    public Category {
        Objects.requireNonNull(id, "id");
        Objects.requireNonNull(name, "name");
        Objects.requireNonNull(slug, "slug");
    }
}
