package com.zappymart.application.ports;

import com.zappymart.domain.promotions.Promotion;
import com.zappymart.domain.promotions.PromotionCode;

import java.util.Optional;

public interface PromotionRepository {

    Optional<Promotion> byCode(PromotionCode code);

    void save(Promotion promotion);
}
