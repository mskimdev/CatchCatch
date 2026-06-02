package com.catchcatch.ticket.refund;

import java.time.LocalDateTime;

public class RefundResponse {

    public static class DetailDTO {

        private Integer id;
        private Integer paymentId;
        private Integer bookingId;
        private Integer refundPrice;
        private Integer cancelFee;
        private String refundReason;
        private LocalDateTime refundedAt;

        public DetailDTO(Refund refund) {
            this.id = refund.getId();
            this.paymentId = refund.getPayment().getId();
            this.bookingId = refund.getPayment().getBooking().getId();
            this.refundPrice = refund.getRefundPrice();
            this.cancelFee = refund.getCancelFee();
            this.refundReason = refund.getRefundReason();
            this.refundedAt = refund.getRefundedAt();
        }

    }

}
