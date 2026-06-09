package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.seat.Seat;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Getter;

import java.sql.Timestamp;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

public class BookingResponse {

    private static final ObjectMapper objectMapper = new ObjectMapper();

    private static final String STATUS_AVAILABLE = "AVAILABLE";
    private static final String STATUS_CONFIRMED = "CONFIRMED";

    @Getter
    public static class DetailDTO {
        private Integer id;
        private Integer userId;
        private Integer concertSessionId;
        private Integer seatId;
        private String bookingNumber;
        private Status status;
        private Timestamp expiresAt;
        private Timestamp createdAt;
        private Timestamp canceledAt;

        public DetailDTO(Booking booking) {
            this.id = booking.getId();
            this.userId = booking.getUser().getId();
            this.concertSessionId = booking.getConcertSession().getId();
            this.seatId = booking.getSeat().getId();
            this.bookingNumber = booking.getBookingNumber();
            this.status = booking.getStatus();
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
        private Integer seatId;
        private Status status;
        private Timestamp createdAt;

        public ListDTO(Booking booking) {
            this.id = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.concertSessionId = booking.getConcertSession().getId();
            this.seatId = booking.getSeat().getId();
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
        private Integer seatId;
        private String concertTitle;
        private String concertPosterUrl;
        private String venueName;
        private String seatName;
        private Integer price;
        private String priceText;

        public MyPageListDTO(Booking booking) {
            this.id = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.status = booking.getStatus();
            this.createdAt = booking.getCreatedAt();
            this.canceledAt = booking.getCanceledAt();

            this.concertSessionId = booking.getConcertSession().getId();
            this.seatId = booking.getSeat().getId();

            this.concertTitle = booking.getConcertSession().getConcert().getTitle();
            this.concertPosterUrl = booking.getConcertSession().getConcert().getPosterUrl();
            this.venueName = booking.getConcertSession().getConcert().getVenue().getName();

            this.seatName = booking.getSeat().getSeatNumber();
            this.price = booking.getSeat().getPrice();
            this.priceText = formatPrice(booking.getSeat().getPrice());
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