package com.catchcatch.ticket.payment;

import lombok.Data;

import java.sql.Timestamp;

public class PaymentResponse {

    @Data
    public static class DetailDTO {
        private String bookingNumber;
        private String impUid;
        private Integer amount;
        private String method;
        private Timestamp paidAt;


        public DetailDTO(Payment payment) {
            this.bookingNumber = payment.getBooking().getBookingNumber();
            this.impUid = payment.getImpUid();
            this.amount = payment.getAmount();
            this.method = payment.getMethod();
            this.paidAt = payment.getPaidAt();
        }
    }

    @Data
    public static class ListDTO {
        private String bookingNumber;
        private Integer amount;
        private Timestamp paidAt;

        public ListDTO(Payment payment) {
            this.bookingNumber = payment.getBooking().getBookingNumber();
            this.amount = payment.getAmount();
            this.paidAt = payment.getPaidAt();
        }
    }
}
