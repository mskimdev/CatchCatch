package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.seat.Seat;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Builder;
import lombok.Data;

import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

public class PaymentResponse {

    /**
     * 결제 상세 DTO
     */
    public record DetailDTO(
            Integer paymentPk,
            String bookingNumber,

            // 결제 정보
            String paymentId,
            String pgTxId,

            Integer originalAmount,
            String originalAmountText,

            Integer ticketFee,
            String ticketFeeText,

            Integer usedPoint,
            String usedPointText,

            // 실제 결제 금액
            Integer amount,
            String amountText,

            String method,
            PaymentStatus status,
            String statusLabel,

            Timestamp createdAt,
            String createdAtText,

            Timestamp paidAt,
            String paidAtText,

            // 예매 정보
            String concertTitle,
            String sessionDateText,
            String seatText,
            Integer seatCount,
            List<SeatDTO> selectedSeats
    ) {
        public DetailDTO(Payment payment) {
            this(
                    payment.getId(),
                    payment.getBooking().getBookingNumber(),

                    payment.getPaymentId(),
                    payment.getPgTxId(),

                    safeAmount(payment.getOriginalAmount()),
                    formatAmount(payment.getOriginalAmount()),

                    safeAmount(payment.getTicketFee()),
                    formatAmount(payment.getTicketFee()),

                    safeAmount(payment.getUsedPoint()),
                    formatPoint(payment.getUsedPoint()),

                    safeAmount(payment.getAmount()),
                    formatAmount(payment.getAmount()),

                    payment.getMethod(),
                    payment.getStatus(),
                    toStatusLabel(payment.getStatus()),

                    payment.getCreatedAt(),
                    formatTimestampSecond(payment.getCreatedAt()),

                    payment.getPaidAt(),
                    formatTimestampSecond(payment.getPaidAt()),

                    getConcertTitle(payment.getBooking()),
                    getSessionDateText(payment.getBooking()),
                    formatSeatText(safeBookingSeats(payment.getBooking())),
                    safeBookingSeats(payment.getBooking()).size(),
                    toSeatDTOList(payment.getBooking())
            );
        }
    }

    /**
     * 결제 목록 DTO
     */
    public record ListDTO(
            Integer id,
            String bookingNumber,
            String concertTitle,
            String seatText,
            Integer seatCount,

            Integer originalAmount,
            String originalAmountText,

            Integer ticketFee,
            String ticketFeeText,

            Integer usedPoint,
            String usedPointText,

            // 실제 결제 금액
            Integer amount,
            String amountText,

            Timestamp paidAt,
            String paidAtText,

            PaymentStatus status,
            String statusLabel,

            Boolean isPaid,
            Boolean isReady,
            Boolean isCancelled,
            Boolean isFailed
    ) {
        public ListDTO(Payment payment) {
            this(
                    payment.getId(),
                    payment.getBooking().getBookingNumber(),
                    getConcertTitle(payment.getBooking()),
                    formatSeatText(safeBookingSeats(payment.getBooking())),
                    safeBookingSeats(payment.getBooking()).size(),

                    safeAmount(payment.getOriginalAmount()),
                    formatAmount(payment.getOriginalAmount()),

                    safeAmount(payment.getTicketFee()),
                    formatAmount(payment.getTicketFee()),

                    safeAmount(payment.getUsedPoint()),
                    formatPoint(payment.getUsedPoint()),

                    safeAmount(payment.getAmount()),
                    formatAmount(payment.getAmount()),

                    payment.getPaidAt(),
                    formatTimestampMinute(payment.getPaidAt()),

                    payment.getStatus(),
                    toStatusLabel(payment.getStatus()),

                    payment.getStatus() == PaymentStatus.PAID,
                    payment.getStatus() == PaymentStatus.READY,
                    payment.getStatus() == PaymentStatus.CANCELLED,
                    payment.getStatus() == PaymentStatus.FAILED
            );
        }
    }

    /**
     * 결제 화면 DTO
     *
     * booking/payment.mustache에서 사용하는 DTO.
     * 이 단계에서는 아직 사용 포인트가 선택되지 않았으므로 usedPoint는 기본 0.
     */
    public record FormDTO(
            Integer bookingId,
            String bookingNumber,

            Integer concertId,
            Integer concertSessionId,

            String concertTitle,
            String posterUrl,
            String sessionText,
            String venueText,

            List<SeatDTO> selectedSeats,
            Integer seatCount,
            String seatText,

            Integer originalAmount,
            String originalAmountText,

            Integer ticketFee,
            String ticketFeeText,

            Integer usedPoint,
            String usedPointText,

            Integer amount,
            String amountText,

            Integer userPoint,
            String userPointText,

            Integer usablePoint,
            String usablePointText,

            Integer userId,
            String userName,
            String userEmail,
            String userPhone
    ) {
        public FormDTO(Booking booking, Integer usablePoint, Integer ticketFee) {
            this(
                    booking.getId(),
                    booking.getBookingNumber(),

                    booking.getConcertSession().getConcert().getId(),
                    booking.getConcertSession().getId(),

                    booking.getConcertSession().getConcert().getTitle(),
                    booking.getConcertSession().getConcert().getPosterUrl(),

                    booking.getConcertSession().getSessionDate()
                            + " "
                            + booking.getConcertSession().getSessionTime(),

                    booking.getConcertSession().getConcert().getVenue().getName(),

                    toSeatDTOList(booking),
                    safeBookingSeats(booking).size(),
                    formatSeatText(safeBookingSeats(booking)),

                    calculateTotalPrice(safeBookingSeats(booking)),
                    formatAmount(calculateTotalPrice(safeBookingSeats(booking))),

                    ticketFee,
                    formatAmount(ticketFee),

                    0,
                    formatPoint(0),

                    calculateTotalPrice(safeBookingSeats(booking)),
                    formatAmount(calculateTotalPrice(safeBookingSeats(booking))),

                    getUserPoint(booking),
                    formatPoint(getUserPoint(booking)),

                    usablePoint == null ? 0 : usablePoint,
                    formatPoint(usablePoint == null ? 0 : usablePoint),

                    booking.getUser().getId(),
                    booking.getUser().getUsername(),
                    booking.getUser().getEmail(),
                    booking.getUser().getPhone()
            );
        }
    }

    /**
     * 예매에 포함된 좌석 1개 DTO
     */
    public record SeatDTO(
            Integer seatId,
            String seatNumber,
            String rowName,
            String seatNo,

            String grade,
            String gradeName,
            String gradeClass,

            Integer price,
            String priceText
    ) {
        public SeatDTO(BookingSeat bookingSeat) {
            this(
                    bookingSeat.getSeat().getId(),
                    bookingSeat.getSeat().getSeatNumber(),
                    parseSeatRowName(bookingSeat.getSeat().getSeatNumber()),
                    parseSeatNo(bookingSeat.getSeat().getSeatNumber()),

                    bookingSeat.getSeat().getGrade().name(),
                    formatGradeName(bookingSeat.getSeat().getGrade().name()),
                    bookingSeat.getSeat().getGrade().name().toLowerCase(),

                    bookingSeat.getPrice(),
                    formatAmount(bookingSeat.getPrice())
            );
        }
    }

    /**
     * 결제 준비 응답 DTO
     *
     * amount는 포인트 차감 후 실제 포트원 결제창에 넘길 금액.
     */
    public record PrepareDTO(
            String paymentId,
            String orderName,

            Integer originalAmount,
            String originalAmountText,

            Integer ticketFee,
            String ticketFeeText,

            Integer usedPoint,
            String usedPointText,

            // 실제 결제 금액
            Integer amount,
            String amountText,

            String storeId,
            String channelKey
    ) {
        public PrepareDTO(Payment payment,
                          String orderName,
                          String storeId,
                          String channelKey) {
            this(
                    payment.getPaymentId(),
                    orderName,

                    safeAmount(payment.getOriginalAmount()),
                    formatAmount(payment.getOriginalAmount()),

                    safeAmount(payment.getTicketFee()),
                    formatAmount(payment.getTicketFee()),

                    safeAmount(payment.getUsedPoint()),
                    formatPoint(payment.getUsedPoint()),

                    safeAmount(payment.getAmount()),
                    formatAmount(payment.getAmount()),

                    storeId,
                    channelKey
            );
        }
    }

    /**
     * 결제 완료 응답 DTO
     */
    public record CompleteDTO(
            Integer paymentPk,
            String paymentId,
            String bookingNumber,

            Integer originalAmount,
            String originalAmountText,

            Integer ticketFee,
            String ticketFeeText,

            Integer usedPoint,
            String usedPointText,

            // 실제 결제 금액
            Integer amount,
            String amountText,

            PaymentStatus status,
            String statusLabel
    ) {
        public CompleteDTO(Payment payment) {
            this(
                    payment.getId(),
                    payment.getPaymentId(),
                    payment.getBooking().getBookingNumber(),

                    safeAmount(payment.getOriginalAmount()),
                    formatAmount(payment.getOriginalAmount()),

                    safeAmount(payment.getTicketFee()),
                    formatAmount(payment.getTicketFee()),

                    safeAmount(payment.getUsedPoint()),
                    formatPoint(payment.getUsedPoint()),

                    safeAmount(payment.getAmount()),
                    formatAmount(payment.getAmount()),

                    payment.getStatus(),
                    toStatusLabel(payment.getStatus())
            );
        }
    }

    /**
     * 포트원 단건조회 API 응답
     *
     * 이건 외부 API JSON 역직렬화용이라 record보다 class 유지 추천.
     */
    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class PortOnePayment {
        private String status; // READY, PAID, FAILED, CANCELLED
        private String id;     // 우리 서버에서 생성한 주문 번호
        private String pgTxId; // PG 거래 번호
        private Amount amount;

        @Data
        @JsonIgnoreProperties(ignoreUnknown = true)
        public static class Amount {
            private Integer total;
            private Integer taxFree;
            private Integer vat;
        }
    }

    private static List<BookingSeat> safeBookingSeats(Booking booking) {
        if (booking == null || booking.getBookingSeats() == null) {
            return List.of();
        }

        return booking.getBookingSeats();
    }

    private static List<SeatDTO> toSeatDTOList(Booking booking) {
        return safeBookingSeats(booking).stream()
                .sorted(Comparator.comparing(bs -> bs.getSeat().getSeatNumber()))
                .map(SeatDTO::new)
                .toList();
    }

    private static String getConcertTitle(Booking booking) {
        if (booking == null || booking.getConcertSession() == null) {
            return "";
        }

        return booking.getConcertSession()
                .getConcert()
                .getTitle();
    }

    private static String getSessionDateText(Booking booking) {
        if (booking == null || booking.getConcertSession() == null) {
            return "";
        }

        return booking.getConcertSession().getSessionDate()
                + " "
                + booking.getConcertSession().getSessionTime();
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

    private static Integer safeAmount(Integer amount) {
        return amount == null ? 0 : amount;
    }

    private static String formatAmount(Integer amount) {
        if (amount == null) {
            return "0원";
        }

        return String.format("%,d원", amount);
    }

    private static String formatPoint(Integer point) {
        if (point == null) {
            return "0P";
        }

        return String.format("%,dP", point);
    }

    private static String formatBlankText(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }

        return value;
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

    private static Integer getUserPoint(Booking booking) {
        if (booking == null || booking.getUser() == null || booking.getUser().getPoint() == null) {
            return 0;
        }

        return booking.getUser().getPoint();
    }
}