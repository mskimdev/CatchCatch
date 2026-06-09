package com.catchcatch.ticket.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;

import java.sql.Timestamp;

public class PaymentResponse {

    @Data
    public static class DetailDTO {
        private String bookingNumber;
        private String paymentId;
        private Integer amount;
        private String method;
        private Timestamp paidAt;


        public DetailDTO(Payment payment) {
            this.bookingNumber = payment.getBooking().getBookingNumber();
            this.paymentId = payment.getPaymentId();
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

    @Data
    public static class PrepareDTO {
        private String paymentId;
        private Integer amount;
        private String storeId;
        private String channelKey;

        @Builder
        public PrepareDTO(String paymentId, Integer amount, String storeId, String channelKey) {
            this.paymentId = paymentId;
            this.amount = amount;
            this.storeId = storeId;
            this.channelKey = channelKey;
        }
    }

    @Getter
    public static class CompleteDTO {

        private String paymentId;
        private String bookingNumber;
        private Integer amount;
        private PaymentStatus status;

        public CompleteDTO(Payment payment) {
            this.paymentId = payment.getPaymentId();
            this.bookingNumber = payment.getBooking().getBookingNumber();
            this.amount = payment.getAmount();
            this.status = payment.getStatus();
        }
    }

    // 포트원 단권조회 API 응답
    @Data
    // JSON 문자열에는 값이 있고, 자바 클래스 필드에는 선언이 없다면 그냥 무시해
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PortOnePayment {
        private String status; // READY, PAID, FAILED, CANCELLED
        private String id; // 우리 서버에서 생성한 주문 번호
        private String pgTxId; // PG 거래 번호 (간혹 null 될 수 있음)
        private Amount amount;

        @Data
        public static class Amount {
            private Integer total;
            private Integer taxFree;
            private Integer vat;
        }
    }
}
