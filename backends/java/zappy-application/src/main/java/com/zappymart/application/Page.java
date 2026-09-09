package com.zappymart.application;

import java.util.List;

public record Page<TItem>(List<TItem> items, boolean hasNextPage, int totalCount) {

    public static final int LARGEST_PAGE = 100;

    public Page {
        items = List.copyOf(items);
    }

    public static <TItem> Page<TItem> slice(List<TItem> everything, int first, int startIndex) {
        int size = Math.clamp(first, 0, LARGEST_PAGE);
        int endIndex = Math.min(startIndex + size, everything.size());
        List<TItem> items = startIndex >= everything.size() ? List.of() : everything.subList(startIndex, endIndex);
        return new Page<>(items, endIndex < everything.size(), everything.size());
    }

    public static <TItem> Page<TItem> empty(int totalCount) {
        return new Page<>(List.of(), false, totalCount);
    }
}
