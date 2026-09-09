package com.zappymart.application.promotions;

import com.zappymart.application.ports.DomainEventHandler;
import com.zappymart.application.ports.PromotionRepository;
import com.zappymart.application.ports.UnitOfWork;
import com.zappymart.domain.ordering.OrderPlaced;
import com.zappymart.domain.promotions.PromotionCode;

public final class CountPromotionUse implements DomainEventHandler<OrderPlaced> {

    private final UnitOfWork unitOfWork;
    private final PromotionRepository promotionRepository;

    public CountPromotionUse(UnitOfWork unitOfWork, PromotionRepository promotionRepository) {
        this.unitOfWork = unitOfWork;
        this.promotionRepository = promotionRepository;
    }

    @Override
    public Class<OrderPlaced> eventType() {
        return OrderPlaced.class;
    }

    @Override
    public void handle(OrderPlaced event) {
        if (event.promotionCode() == null) {
            return;
        }
        unitOfWork.inTransaction(() -> {
            PromotionCode.parse(event.promotionCode())
                    .flatMap(promotionRepository::byCode)
                    .ifPresent(promotion -> promotionRepository.save(promotion.afterOneMoreUse()));
            return true;
        });
    }
}
