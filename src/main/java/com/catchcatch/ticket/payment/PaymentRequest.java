package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.core.exception.BadRequestException;
import lombok.Data;
import lombok.Getter;

public class PaymentRequest {

    @Getter
    public static class PrepareDTO {
        private Integer bookingId;
        private String method;

        public PrepareDTO(Integer bookingId, String method) {
            this.bookingId = bookingId;
            this.method = method;
        }
    }

    @Data
    public static class CompleteDTO {

        private String paymentId;

        public void validate() {
            if(this.paymentId == null || paymentId.trim().isEmpty()) {
                throw new BadRequestException("결제 건 식별자가 필요합니다.");
            }
        }
    }
}
