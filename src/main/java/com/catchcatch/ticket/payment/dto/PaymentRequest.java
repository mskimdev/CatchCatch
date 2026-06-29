package com.catchcatch.ticket.payment.dto;

import com.catchcatch.ticket.core.exception.BadRequestException;

public class PaymentRequest {

    public record PrepareDTO (
            Integer bookingId,
            String method,
            Integer usedPoint
    ) {
        public void validate() {
            if (bookingId == null) {
                throw new RuntimeException("예매 ID가 필요합니다.");
            }

            if (method == null || method.isBlank()) {
                throw new RuntimeException("결제 수단이 필요합니다.");
            }

            if (usedPoint != null && usedPoint < 0) {
                throw new RuntimeException("사용 포인트가 올바르지 않습니다.");
            }
        }

        public Integer usedPointValue() {
            return usedPoint == null ? 0 : usedPoint;
        }
    }

    public record CompleteDTO (
        String paymentId,
        Boolean notifySms,
        String smsPhone,
        Boolean updateProfile
    ){
        public void validate() {
            if(this.paymentId == null || this.paymentId.isBlank()) {
                throw new BadRequestException("결제 번호가 필요합니다.");
            }
        }

        public boolean shouldSendSms() {
            return Boolean.TRUE.equals(notifySms)
                    && smsPhone != null
                    && !smsPhone.isBlank();
        }

        public boolean shouldUpdateProfile() {
            return Boolean.TRUE.equals(updateProfile)
                    && smsPhone != null
                    && !smsPhone.isBlank();
        }
    }
}
