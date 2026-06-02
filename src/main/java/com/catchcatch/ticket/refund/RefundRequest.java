package com.catchcatch.ticket.refund;

import lombok.Getter;
import lombok.NoArgsConstructor;

public class RefundRequest {

    @Getter
    @NoArgsConstructor
    public static class SaveDTO {

        private Integer paymentId;
        private String reason;

        public SaveDTO(Integer paymentId, String reason) {
            this.paymentId = paymentId;
            this.reason = reason;
        }
    }
}