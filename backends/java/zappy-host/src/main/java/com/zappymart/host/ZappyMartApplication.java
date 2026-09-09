package com.zappymart.host;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.persistence.autoconfigure.EntityScan;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootApplication(scanBasePackages = "com.zappymart")
@EntityScan("com.zappymart.adapters.persistence")
@EnableJpaRepositories("com.zappymart.adapters.persistence")
public class ZappyMartApplication {

    public static void main(String[] arguments) {
        SpringApplication.run(ZappyMartApplication.class, arguments);
    }
}
