package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.seat.Seat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;
import lombok.Getter;

import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class PaymentResponse {

    @Data
    public static class DetailDTO {
        private Integer paymentPk;

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
        private Integer seatCount;
        private List<SeatDTO> selectedSeats;

        public DetailDTO(Payment payment) {
            Booking booking = payment.getBooking();
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            this.paymentPk = payment.getId();

            this.bookingNumber = booking.getBookingNumber();

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

            this.concertTitle = booking.getConcertSession()
                    .getConcert()
                    .getTitle();

            this.sessionDateText =
                    booking.getConcertSession().getSessionDate()
                            + " "
                            + booking.getConcertSession().getSessionTime();

            this.seatCount = bookingSeats.size();
            this.seatText = formatSeatText(bookingSeats);

            this.selectedSeats = bookingSeats.stream()
                    .sorted(Comparator.comparing(bs -> bs.getSeat().getSeatNumber()))
                    .map(SeatDTO::new)
                    .toList();
        }
    }

    @Data
    public static class ListDTO {
        private Integer id;
        private String bookingNumber;
        private String concertTitle;
        private String seatText;
        private Integer seatCount;

        private Integer amount;
        private String amountText;

        private Timestamp paidAt;
        private String paidAtText;

        private PaymentStatus status;
        private String statusLabel;

        private Boolean isPaid;
        private Boolean isReady;
        private Boolean isCancelled;
        private Boolean isFailed;

        public ListDTO(Payment payment) {
            Booking booking = payment.getBooking();
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            this.id = payment.getId();
            this.bookingNumber = booking.getBookingNumber();

            this.concertTitle = booking.getConcertSession()
                    .getConcert()
                    .getTitle();

            this.seatCount = bookingSeats.size();
            this.seatText = formatSeatText(bookingSeats);

            this.amount = payment.getAmount();
            this.amountText = formatAmount(payment.getAmount());

            this.paidAt = payment.getPaidAt();
            this.paidAtText = formatTimestampMinute(payment.getPaidAt());

            this.status = payment.getStatus();
            this.statusLabel = toStatusLabel(payment.getStatus());

            this.isPaid = payment.getStatus() == PaymentStatus.PAID;
            this.isReady = payment.getStatus() == PaymentStatus.READY;
            this.isCancelled = payment.getStatus() == PaymentStatus.CANCELLED;
            this.isFailed = payment.getStatus() == PaymentStatus.FAILED;
        }
    }

    /**
     * 결제 화면 DTO
     *
     * booking/payment.mustache에서
     * {{payment.bookingId}}, {{payment.selectedSeats}}, {{payment.totalPriceText}}
     * 이런 식으로 사용하기 위한 DTO.
     */
    @Getter
    public static class FormDTO {
        private Integer bookingId;
        private String bookingNumber;

        private Integer concertId;
        private Integer concertSessionId;

        private String concertTitle;
        private String posterUrl;
        private String sessionText;
        private String venueText;

        private List<SeatDTO> selectedSeats;
        private Integer seatCount;
        private String seatText;

        private Integer totalPrice;
        private String totalPriceText;
        private String ticketPriceText;
        private String feeText;

        private Integer userId;
        private String userName;
        private String userEmail;
        private String userPhone;

        public FormDTO(Booking booking) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            this.bookingId = booking.getId();
            this.bookingNumber = booking.getBookingNumber();

            this.concertId = booking.getConcertSession()
                    .getConcert()
                    .getId();

            this.concertSessionId = booking.getConcertSession().getId();

            this.concertTitle = booking.getConcertSession()
                    .getConcert()
                    .getTitle();

            this.posterUrl = booking.getConcertSession()
                    .getConcert()
                    .getPosterUrl();

            this.sessionText = booking.getConcertSession().getSessionDate()
                    + " "
                    + booking.getConcertSession().getSessionTime();

            this.venueText = booking.getConcertSession()
                    .getConcert()
                    .getVenue()
                    .getName();

            this.selectedSeats = bookingSeats.stream()
                    .sorted(Comparator.comparing(bs -> bs.getSeat().getSeatNumber()))
                    .map(SeatDTO::new)
                    .toList();

            this.seatCount = bookingSeats.size();
            this.seatText = formatSeatText(bookingSeats);

            this.totalPrice = calculateTotalPrice(bookingSeats);
            this.totalPriceText = formatAmount(this.totalPrice);
            this.ticketPriceText = formatAmount(this.totalPrice);
            this.feeText = formatAmount(0);

            this.userId = booking.getUser().getId();
            this.userName = booking.getUser().getUsername();
            this.userEmail = booking.getUser().getEmail();

            // User 엔티티에 phone 필드가 없다면 null로 둔다.
            // mustache에서 {{^payment.userPhone}} 기본값 처리가 가능함.
            this.userPhone = null;
        }
    }

    /**
     * 예매에 포함된 좌석 1개 DTO
     */
    @Getter
    public static class SeatDTO {
        private Integer seatId;
        private String seatNumber;
        private String rowName;
        private String seatNo;

        private String grade;
        private String gradeName;
        private String gradeClass;

        private Integer price;
        private String priceText;

        public SeatDTO(BookingSeat bookingSeat) {
            Seat seat = bookingSeat.getSeat();

            String seatNumber = seat.getSeatNumber();
            String grade = seat.getGrade().name();

            this.seatId = seat.getId();
            this.seatNumber = seatNumber;
            this.rowName = parseSeatRowName(seatNumber);
            this.seatNo = parseSeatNo(seatNumber);

            this.grade = grade;
            this.gradeName = formatGradeName(grade);
            this.gradeClass = grade.toLowerCase();

            this.price = bookingSeat.getPrice();
            this.priceText = formatAmount(bookingSeat.getPrice());
        }
    }

    @Data
    public static class PrepareDTO {
        private String paymentId;
        private String orderName;
        private Integer amount;
        private String storeId;
        private String channelKey;

        @Builder
        public PrepareDTO(String paymentId, String orderName, Integer amount, String storeId, String channelKey) {
            this.paymentId = paymentId;
            this.orderName = orderName;
            this.amount = amount;
            this.storeId = storeId;
            this.channelKey = channelKey;
        }

        /**
         * 기존 코드 호환용 생성자
         *
         * 기존 PaymentService에서
         * new PaymentResponse.PrepareDTO(paymentId, amount, storeId, channelKey)
         * 형태로 쓰고 있다면 그대로 컴파일되게 하기 위함.
         */
        public PrepareDTO(String paymentId, Integer amount, String storeId, String channelKey) {
            this.paymentId = paymentId;
            this.orderName = "CatchCatch 좌석 예매";
            this.amount = amount;
            this.storeId = storeId;
            this.channelKey = channelKey;
        }
    }

    @Getter
    public static class CompleteDTO {
        private Integer paymentPk;
        private String paymentId;
        private String bookingNumber;
        private Integer amount;
        private String amountText;
        private PaymentStatus status;
        private String statusLabel;

        public CompleteDTO(Payment payment) {
            this.paymentPk = payment.getId();
            this.paymentId = payment.getPaymentId();
            this.bookingNumber = payment.getBooking().getBookingNumber();
            this.amount = payment.getAmount();
            this.amountText = formatAmount(payment.getAmount());
            this.status = payment.getStatus();
            this.statusLabel = toStatusLabel(payment.getStatus());
        }
    }

    // 포트원 단건조회 API 응답
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PortOnePayment {
        private String status; // READY, PAID, FAILED, CANCELLED
        private String id; // 우리 서버에서 생성한 주문 번호
        private String pgTxId; // PG 거래 번호
        private Amount amount;

        @Data
        public static class Amount {
            private Integer total;
            private Integer taxFree;
            private Integer vat;
        }
    }

    private static List<BookingSeat> safeBookingSeats(Booking booking) {
        if (booking.getBookingSeats() == null) {
            return List.of();
        }

        return booking.getBookingSeats();
    }

    private static Integer calculateTotalPrice(List<BookingSeat> bookingSeats) {
        if (bookingSeats == null || bookingSeats.isEmpty()) {
            return 0;
        }

        return bookingSeats.stream()
                .mapToInt(bookingSeat -> bookingSeat.getPrice() == null ? 0 : bookingSeat.getPrice())
                .sum();
    }

    private static String formatSeatText(List<BookingSeat> bookingSeats) {
        if (bookingSeats == null || bookingSeats.isEmpty()) {
            return "";
        }

        return bookingSeats.stream()
                .sorted(Comparator.comparing(bs -> bs.getSeat().getSeatNumber()))
                .map(bookingSeat -> bookingSeat.getSeat().getSeatNumber())
                .collect(Collectors.joining(", "));
    }

    private static String formatAmount(Integer amount) {
        if (amount == null) {
            return "0원";
        }

        return String.format("%,d원", amount);
    }

    private static String formatTimestampSecond(Timestamp timestamp) {
        if (timestamp == null) {
            return "-";
        }

        return timestamp.toLocalDateTime()
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    private static String formatTimestampMinute(Timestamp timestamp) {
        if (timestamp == null) {
            return "결제 대기";
        }

        return timestamp.toLocalDateTime()
                .format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm"));
    }

    private static String toStatusLabel(PaymentStatus status) {
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

    private static String parseSeatRowName(String seatNumber) {
        if (seatNumber == null || seatNumber.isBlank()) {
            return "";
        }

        int dashIndex = seatNumber.indexOf("-");

        if (dashIndex == -1) {
            return seatNumber;
        }

        return seatNumber.substring(0, dashIndex);
    }

    private static String parseSeatNo(String seatNumber) {
        if (seatNumber == null || seatNumber.isBlank()) {
            return "";
        }

        int dashIndex = seatNumber.indexOf("-");

        if (dashIndex == -1 || dashIndex == seatNumber.length() - 1) {
            return seatNumber;
        }

        return seatNumber.substring(dashIndex + 1);
    }

    private static String formatGradeName(String grade) {
        if (grade == null || grade.isBlank()) {
            return "";
        }

        return grade + "석";
    }
}