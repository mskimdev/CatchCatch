package com.catchcatch.ticket.refund;

import java.time.LocalDateTime;

public class RefundResponse {

    public static class DetailDTO {

        private Integer id;
        private Integer paymentId;
        private Integer bookingId;
        private Integer amount;
        private Integer cancelFee;
        private String reason;
        private LocalDateTime refundedAt;

        public DetailDTO(Refund refund) {
            this.id = refund.getId();
            this.paymentId = refund.getPayment().getId();
            this.bookingId = refund.getPayment().getBooking().getId();
            this.amount = refund.getAmount();
            this.cancelFee = refund.getCancelFee();
            this.reason = refund.getReason();
            this.refundedAt = refund.getRefundedAt();
        }

    }

}
