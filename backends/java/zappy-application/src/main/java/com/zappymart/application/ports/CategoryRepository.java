package com.zappymart.application.ports;

import com.zappymart.domain.catalogue.Category;

import java.util.List;

public interface CategoryRepository {

    List<Category> inCatalogueOrder();
}
