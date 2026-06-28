package com.catchcatch.ticket.refund.dto;

import com.catchcatch.ticket.refund.Refund;

public class RefundResponse {

    public record DetailDTO(
            Integer refundId,          // 환불 고유 ID
            String paymentId,          // 포트원 결제 고유 ID
            Integer refundedAmount,    // 실제 계좌/카드로 환불된 금액 (PG)
            Integer refundedPoint,     // 만료 안 되어서 최종 복구된 포인트
            Integer cancelFee,         // 차감된 취소 수수료
            String reason,             // 취소 사유
            String refundedAt          // 환불 완료 일시
    ) {
        // 엔티티를 DTO로 변환하는 커스텀 생성자
        public DetailDTO(Refund refund, int actualRefundedPoint) {
            this(
                    refund.getId(),
                    refund.getPayment().getPaymentId(),
                    refund.getAmount(),
                    actualRefundedPoint,
                    refund.getCancelFee(),
                    refund.getReason(),
                    refund.getRefundedAt() != null ? refund.getRefundedAt().toString() : null // NullPointerException 방지
            );
        }
    }

}
