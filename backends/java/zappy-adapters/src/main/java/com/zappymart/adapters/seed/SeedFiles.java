package com.zappymart.adapters.seed;

import org.springframework.core.io.ClassPathResource;
import tools.jackson.databind.json.JsonMapper;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

public final class SeedFiles {

    private static final String FOLDER = "seed/";

    private final JsonMapper jsonMapper = JsonMapper.builder().build();

    public List<SeedCategory> categories() {
        return read("categories.json", SeedCategory[].class);
    }

    public List<SeedProduct> products() {
        return read("products.json", SeedProduct[].class);
    }

    public List<SeedPromotion> promotionCodes() {
        return read("promotion-codes.json", SeedPromotion[].class);
    }

    public List<SeedCustomer> customers() {
        return read("customers.json", SeedCustomer[].class);
    }

    private <TItem> List<TItem> read(String fileName, Class<TItem[]> shape) {
        try (InputStream contents = new ClassPathResource(FOLDER + fileName).getInputStream()) {
            return List.of(jsonMapper.readValue(contents, shape));
        } catch (IOException unreadable) {
            throw new IllegalStateException("The seed file " + FOLDER + fileName + " is not on the classpath. "
                    + "The build copies it there from contract/seed.", unreadable);
        }
    }
}
