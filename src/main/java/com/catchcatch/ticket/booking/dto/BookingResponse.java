package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.seat.Seat;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;

import java.sql.Timestamp;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

public class BookingResponse {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private static final String STATUS_AVAILABLE = "AVAILABLE";

    /*
     * 화면에서 이미 선택 불가능한 좌석을 표시할 때 쓰는 값.
     * 실제 SeatStatus.SOLD와 이름이 다르더라도 프론트 표시용으로 쓸 수 있음.
     */
    private static final String STATUS_CONFIRMED = "CONFIRMED";

    @Getter
    public static class DetailDTO {
        private Integer id;
        private Integer userId;
        private Integer concertSessionId;

        private List<Integer> seatIds;
        private Integer seatCount;
        private String seatName;

        private String bookingNumber;
        private Status status;

        private Integer totalPrice;
        private String totalPriceText;

        private Timestamp expiresAt;
        private Timestamp createdAt;
        private Timestamp canceledAt;

        public DetailDTO(Booking booking) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            this.id = booking.getId();
            this.userId = booking.getUser().getId();
            this.concertSessionId = booking.getConcertSession().getId();

            this.seatIds = bookingSeats.stream()
                    .map(bookingSeat -> bookingSeat.getSeat().getId())
                    .toList();

            this.seatCount = bookingSeats.size();
            this.seatName = formatSeatName(bookingSeats);

            this.bookingNumber = booking.getBookingNumber();
            this.status = booking.getStatus();

            this.totalPrice = calculateTotalPrice(bookingSeats);
            this.totalPriceText = formatPrice(this.totalPrice);

            this.expiresAt = booking.getExpiresAt();
            this.createdAt = booking.getCreatedAt();
            this.canceledAt = booking.getCanceledAt();
        }
    }

    @Getter
    public static class ListDTO {
        private Integer id;
        private String bookingNumber;
        private Integer concertSessionId;

        private List<Integer> seatIds;
        private Integer seatCount;
        private String seatName;

        private Integer totalPrice;
        private String totalPriceText;

        private Status status;
        private Timestamp createdAt;

        public ListDTO(Booking booking) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            this.id = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.concertSessionId = booking.getConcertSession().getId();

            this.seatIds = bookingSeats.stream()
                    .map(bookingSeat -> bookingSeat.getSeat().getId())
                    .toList();

            this.seatCount = bookingSeats.size();
            this.seatName = formatSeatName(bookingSeats);

            this.totalPrice = calculateTotalPrice(bookingSeats);
            this.totalPriceText = formatPrice(this.totalPrice);

            this.status = booking.getStatus();
            this.createdAt = booking.getCreatedAt();
        }
    }

    @Getter
    public static class MyPageListDTO {
        private Integer id;
        private String bookingNumber;
        private Status status;
        private Timestamp createdAt;
        private Timestamp canceledAt;

        private Integer concertSessionId;
        private List<Integer> seatIds;
        private Integer seatCount;

        private String concertTitle;
        private String concertPosterUrl;
        private String venueName;

        private String seatName;

        private Integer price;
        private String priceText;

        public MyPageListDTO(Booking booking) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            this.id = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.status = booking.getStatus();
            this.createdAt = booking.getCreatedAt();
            this.canceledAt = booking.getCanceledAt();

            this.concertSessionId = booking.getConcertSession().getId();

            this.seatIds = bookingSeats.stream()
                    .map(bookingSeat -> bookingSeat.getSeat().getId())
                    .toList();

            this.seatCount = bookingSeats.size();

            this.concertTitle = booking.getConcertSession().getConcert().getTitle();
            this.concertPosterUrl = booking.getConcertSession().getConcert().getPosterUrl();
            this.venueName = booking.getConcertSession().getConcert().getVenue().getName();

            this.seatName = formatSeatName(bookingSeats);

            this.price = calculateTotalPrice(bookingSeats);
            this.priceText = formatPrice(this.price);
        }
    }

    /**
     * 결제 화면 DTO
     *
     * booking/payment.mustache 또는 payment/payment-form.mustache에서
     * {{payment.bookingId}}, {{payment.selectedSeats}}, {{payment.totalPriceText}}
     * 형태로 사용하기 위한 DTO.
     */
    @Getter
    public static class PaymentDTO {
        private Integer bookingId;
        private String bookingNumber;

        private Integer concertId;
        private Integer concertSessionId;

        private String concertTitle;
        private String posterUrl;
        private String sessionText;
        private String venueText;

        private List<BookingSeatDTO> selectedSeats;
        private Integer seatCount;
        private String seatName;

        private Integer totalPrice;
        private String totalPriceText;
        private String ticketPriceText;
        private String feeText;

        private Integer userId;
        private String username;
        private String userEmail;

        public PaymentDTO(Booking booking) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            this.bookingId = booking.getId();
            this.bookingNumber = booking.getBookingNumber();

            this.concertId = booking.getConcertSession().getConcert().getId();
            this.concertSessionId = booking.getConcertSession().getId();

            this.concertTitle = booking.getConcertSession().getConcert().getTitle();
            this.posterUrl = booking.getConcertSession().getConcert().getPosterUrl();

            this.sessionText = booking.getConcertSession().getSessionDate()
                    + " "
                    + booking.getConcertSession().getSessionTime();

            this.venueText = booking.getConcertSession().getConcert().getVenue().getName();

            this.selectedSeats = bookingSeats.stream()
                    .sorted(Comparator.comparing(bookingSeat -> bookingSeat.getSeat().getSeatNumber()))
                    .map(BookingSeatDTO::new)
                    .toList();

            this.seatCount = bookingSeats.size();
            this.seatName = formatSeatName(bookingSeats);

            this.totalPrice = calculateTotalPrice(bookingSeats);
            this.totalPriceText = formatPrice(this.totalPrice);
            this.ticketPriceText = formatPrice(this.totalPrice);
            this.feeText = formatPrice(0);

            this.userId = booking.getUser().getId();
            this.username = booking.getUser().getUsername();
            this.userEmail = booking.getUser().getEmail();
        }
    }

    /**
     * 예매에 포함된 좌석 한 개를 화면에 보여주기 위한 DTO
     */
    @Getter
    public static class BookingSeatDTO {
        private Integer seatId;
        private String seatNumber;
        private String rowName;
        private String seatNo;
        private String grade;
        private String gradeName;
        private String gradeClass;
        private Integer price;
        private String priceText;

        public BookingSeatDTO(BookingSeat bookingSeat) {
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
            this.priceText = formatPrice(bookingSeat.getPrice());
        }
    }

    @Getter
    public static class SeatFormDTO {
        private List<SeatDTO> seats;
        private List<SeatGradeTabDTO> gradeTabs;
        private String seatsJson;

        public SeatFormDTO(List<Seat> seats) {
            this(seats, Set.of());
        }

        public SeatFormDTO(List<Seat> seats, Set<Integer> bookedSeatIds) {
            Set<Integer> safeBookedSeatIds = bookedSeatIds == null ? Set.of() : bookedSeatIds;

            this.seats = seats.stream()
                    .sorted(Comparator
                            .comparingInt((Seat seat) -> seatGradeOrder(seat.getGrade().name()))
                            .thenComparing(Seat::getSeatNumber))
                    .map(seat -> new SeatDTO(seat, safeBookedSeatIds.contains(seat.getId())))
                    .toList();

            this.gradeTabs = this.seats.stream()
                    .map(SeatDTO::getGrade)
                    .distinct()
                    .map(SeatGradeTabDTO::new)
                    .toList();

            activateFirstGradeTab();

            this.seatsJson = toJson(this.seats);
        }

        private void activateFirstGradeTab() {
            if (!gradeTabs.isEmpty()) {
                gradeTabs.get(0).active = true;
            }
        }
    }

    @Getter
    public static class SeatDTO {
        private Integer id;
        private String seatNumber;
        private String rowName;
        private String seatNo;
        private String grade;
        private String gradeName;
        private String gradeClass;
        private Integer price;
        private String priceText;
        private String status;
        private Boolean available;

        public SeatDTO(Seat seat) {
            this(seat, false);
        }

        public SeatDTO(Seat seat, boolean alreadyBooked) {
            String seatNumber = seat.getSeatNumber();
            String grade = seat.getGrade().name();
            String seatStatus = seat.getStatus().name();

            this.id = seat.getId();
            this.seatNumber = seatNumber;
            this.rowName = parseSeatRowName(seatNumber);
            this.seatNo = parseSeatNo(seatNumber);

            this.grade = grade;
            this.gradeName = formatGradeName(grade);
            this.gradeClass = grade.toLowerCase();

            this.price = seat.getPrice();
            this.priceText = formatPrice(seat.getPrice());

            if (alreadyBooked) {
                this.status = STATUS_CONFIRMED;
                this.available = false;
            } else {
                this.status = seatStatus;
                this.available = STATUS_AVAILABLE.equals(seatStatus);
            }
        }
    }

    @Getter
    public static class SeatGradeTabDTO {
        private String grade;
        private String gradeName;
        private String gradeClass;
        private Boolean active = false;

        public SeatGradeTabDTO(String grade) {
            this.grade = grade;
            this.gradeName = formatGradeName(grade);
            this.gradeClass = grade.toLowerCase();
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

    private static String formatSeatName(List<BookingSeat> bookingSeats) {
        if (bookingSeats == null || bookingSeats.isEmpty()) {
            return "";
        }

        return bookingSeats.stream()
                .map(bookingSeat -> bookingSeat.getSeat().getSeatNumber())
                .collect(Collectors.joining(", "));
    }

    private static int seatGradeOrder(String grade) {
        if (grade == null) {
            return 99;
        }

        return switch (grade.toUpperCase()) {
            case "VIP" -> 1;
            case "R" -> 2;
            case "S" -> 3;
            case "A" -> 4;
            case "B" -> 5;
            default -> 99;
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

    private static String formatPrice(Integer price) {
        if (price == null) {
            return "0원";
        }

        return String.format("%,d원", price);
    }

    private static String toJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new IllegalStateException("JSON 변환 중 오류가 발생했습니다.", e);
        }
    }
}