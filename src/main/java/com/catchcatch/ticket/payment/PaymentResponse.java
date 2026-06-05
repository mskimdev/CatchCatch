package com.catchcatch.ticket.payment;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;

import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;

public class PaymentResponse {

    @Data
    public static class DetailDTO {
        private String bookingNumber;

        // 결제 정보
        private String paymentId;
        private String pgTxId;
        private String pgTxIdText;
        private Integer amount;
        private String amountText;
        private String method;
        private PaymentStatus status;
        private String statusLabel;
        private Timestamp createdAt;
        private String createdAtText;
        private Timestamp paidAt;
        private String paidAtText;

        // 예매 정보
        private String concertTitle;
        private String sessionDateText;
        private String seatText;

        public DetailDTO(Payment payment) {
            this.bookingNumber = payment.getBooking().getBookingNumber();

            this.paymentId = payment.getPaymentId();
            this.pgTxId = payment.getPgTxId();
            this.pgTxIdText = payment.getPgTxId() == null || payment.getPgTxId().isBlank()
                    ? "-"
                    : payment.getPgTxId();

            this.amount = payment.getAmount();
            this.amountText = formatAmount(payment.getAmount());

            this.method = payment.getMethod();
            this.status = payment.getStatus();
            this.statusLabel = toStatusLabel(payment.getStatus());

            this.createdAt = payment.getCreatedAt();
            this.createdAtText = formatTimestampSecond(payment.getCreatedAt());

            this.paidAt = payment.getPaidAt();
            this.paidAtText = formatTimestampSecond(payment.getPaidAt());

            this.concertTitle = payment.getBooking()
                    .getConcertSession()
                    .getConcert()
                    .getTitle();

            this.sessionDateText =
                    payment.getBooking().getConcertSession().getSessionDate()
                            + " "
                            + payment.getBooking().getConcertSession().getSessionTime();

            this.seatText = payment.getBooking().getSeat().getSeatNumber();
        }

        private String formatAmount(Integer amount) {
            if (amount == null) {
                return "0원";
            }

            return String.format("%,d원", amount);
        }

        private String formatTimestampSecond(Timestamp timestamp) {
            if (timestamp == null) {
                return "-";
            }

            return timestamp.toLocalDateTime()
                    .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
        }

        private String toStatusLabel(PaymentStatus status) {
            if (status == null) {
                return "-";
            }

            return switch (status) {
                case READY -> "결제대기";
                case PAID -> "결제완료";
                case CANCELLED -> "결제취소";
                case FAILED -> "결제실패";
            };
        }
    }

    @Data
    public static class ListDTO {
        private Integer id;
        private String bookingNumber;
        private String concertTitle;
        private Integer amount;
        private Timestamp paidAt;
        private String paidAtText;
        private PaymentStatus status;

        private Boolean isPaid;
        private Boolean isReady;
        private Boolean isCancelled;

        public ListDTO(Payment payment) {
            this.id = payment.getId();
            this.bookingNumber = payment.getBooking().getBookingNumber();

            this.concertTitle = payment.getBooking()
                    .getConcertSession()
                    .getConcert()
                    .getTitle();

            this.amount = payment.getAmount();
            this.paidAt = payment.getPaidAt();
            this.paidAtText = formatPaidAtMinute(payment.getPaidAt());
            this.status = payment.getStatus();

            this.isPaid = payment.getStatus() == PaymentStatus.PAID;
            this.isReady = payment.getStatus() == PaymentStatus.READY;
            this.isCancelled = payment.getStatus() == PaymentStatus.CANCELLED;
        }

        private String formatPaidAtMinute(Timestamp paidAt) {
            if (paidAt == null) {
                return "결제 대기";
            }

            return paidAt.toLocalDateTime()
                    .format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
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
        private String status; // READY, PAID, FAILED, CANCELED
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
