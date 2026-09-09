package com.zappymart.adapters.graphql;

import com.zappymart.application.catalogue.FindProductBySlug;
import com.zappymart.application.catalogue.ListCategories;
import com.zappymart.application.catalogue.ListProducts;
import com.zappymart.application.catalogue.ProductFilter;
import com.zappymart.domain.catalogue.Category;
import com.zappymart.domain.catalogue.Product;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
public class CatalogueController {

    public static final int PRODUCTS_PER_PAGE = 24;

    private final ListProducts listProducts;
    private final FindProductBySlug findProductBySlug;
    private final ListCategories listCategories;

    public CatalogueController(ListProducts listProducts, FindProductBySlug findProductBySlug,
                               ListCategories listCategories) {
        this.listProducts = listProducts;
        this.findProductBySlug = findProductBySlug;
        this.listCategories = listCategories;
    }

    @QueryMapping
    public ProductConnection products(@Argument ProductFilter filter,
                                      @Argument Integer first,
                                      @Argument String after) {
        ProductFilter narrowing = filter == null ? ProductFilter.everything() : filter;
        int pageSize = first == null ? PRODUCTS_PER_PAGE : first;
        return ProductConnection.of(listProducts.execute(narrowing, pageSize, Cursors.decode(after)));
    }

    @QueryMapping
    public Product product(@Argument String slug) {
        return findProductBySlug.execute(slug).orElse(null);
    }

    @QueryMapping
    public List<Category> categories() {
        return listCategories.execute();
    }
}
