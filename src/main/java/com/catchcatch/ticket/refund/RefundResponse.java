package com.catchcatch.ticket.refund;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class RefundResponse {

    @Getter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailDTO {
        private Integer refundId;          // 환불 고유 ID
        private String paymentId;          // 포트원 결제 고유 ID
        private Integer refundedAmount;    // 실제 계좌/카드로 환불된 금액 (PG)
        private Integer refundedPoint;     // 만료 안 되어서 최종 복구된 포인트
        private Integer cancelFee;         // 차감된 취소 수수료
        private String reason;             // 취소 사유
        private String refundedAt;         // 환불 완료 일시

        // 엔티티를 DTO로 변환하는 생성자
        public DetailDTO(Refund refund, int actualRefundedPoint) {
            this.refundId = refund.getId();
            this.paymentId = refund.getPayment().getPaymentId();
            this.refundedAmount = refund.getAmount();
            this.cancelFee = refund.getCancelFee();
            this.reason = refund.getReason();
            this.refundedAt = refund.getRefundedAt().toString();
            this.refundedPoint = actualRefundedPoint;
        }
    }

}
