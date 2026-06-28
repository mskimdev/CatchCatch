package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.booking.enums.Status;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.core.exception.InternalServerErrorException;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.session.ConcertSession;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.sql.Timestamp;
import java.util.Comparator;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

public class BookingResponse {

    private static final ObjectMapper OBJECT_MAPPER = new ObjectMapper();
    private static final String STATUS_AVAILABLE = "AVAILABLE";
    private static final String STATUS_CONFIRMED = "CONFIRMED";

    private BookingResponse() {
    }

    public record InfoDTO(
            Integer id,
            String title,
            String posterUrl,
            String category,
            String genre,
            Integer sessionId,
            String sessionText,
            String venueName,
            String ageLimit,
            String runtime,
            String organizer,
            String contact,
            List<PriceDTO> prices
    ) {
        public static InfoDTO from(Concert concert, ConcertSession concertSession, List<Seat> seats) {
            return new InfoDTO(
                    concert.getId(),
                    concert.getTitle(),
                    concert.getPosterUrl(),
                    concert.getCategory(),
                    concert.getGenre(),
                    concertSession.getId(),
                    concertSession.getSessionDate() + " " + concertSession.getSessionTime(),
                    concert.getVenue().getName(),
                    concert.getAgeLimit(),
                    concert.getRuntime(),
                    concert.getOrganizer(),
                    concert.getContact(),
                    toPriceDTOs(seats)
            );
        }
    }

    public record PriceDTO(
            String gradeName,
            String gradeClass,
            String priceText
    ) {
    }

    public record DetailDTO(
            Integer id,
            Integer userId,
            Integer concertSessionId,
            List<Integer> seatIds,
            Integer seatCount,
            String seatName,
            String bookingNumber,
            Status status,
            Integer totalPrice,
            String totalPriceText,
            Timestamp expiresAt,
            Timestamp createdAt,
            Timestamp canceledAt
    ) {
        public DetailDTO(Booking booking) {
            this(booking, BookingSeatSummary.from(booking));
        }

        private DetailDTO(Booking booking, BookingSeatSummary summary) {
            this(
                    booking.getId(),
                    booking.getUser().getId(),
                    booking.getConcertSession().getId(),
                    summary.seatIds(),
                    summary.seatCount(),
                    summary.seatName(),
                    booking.getBookingNumber(),
                    booking.getStatus(),
                    summary.totalPrice(),
                    summary.totalPriceText(),
                    booking.getExpiresAt(),
                    booking.getCreatedAt(),
                    booking.getCanceledAt()
            );
        }
    }

    public record ListDTO(
            Integer id,
            String bookingNumber,
            Integer concertSessionId,
            List<Integer> seatIds,
            Integer seatCount,
            String seatName,
            Integer totalPrice,
            String totalPriceText,
            Status status,
            Timestamp createdAt
    ) {
        public ListDTO(Booking booking) {
            this(booking, BookingSeatSummary.from(booking));
        }

        private ListDTO(Booking booking, BookingSeatSummary summary) {
            this(
                    booking.getId(),
                    booking.getBookingNumber(),
                    booking.getConcertSession().getId(),
                    summary.seatIds(),
                    summary.seatCount(),
                    summary.seatName(),
                    summary.totalPrice(),
                    summary.totalPriceText(),
                    booking.getStatus(),
                    booking.getCreatedAt()
            );
        }
    }

    public record AdminListDTO(
            Integer bookingId,
            Integer userId,
            String userName,
            String concertTitle,
            String createdAt,
            Boolean isCancelled
    ) {
        public AdminListDTO(Booking booking) {
            this(
                    booking.getId(),
                    booking.getUser().getId(),
                    booking.getUser().getUsername(),
                    booking.getConcertSession().getConcert().getTitle(),
                    booking.getCreatedAt() == null ? "" : booking.getCreatedAt().toString(),
                    booking.getStatus() == Status.CANCELED
            );
        }
    }

    public record MyPageListDTO(
            Integer id,
            String bookingNumber,
            Status status,
            Timestamp createdAt,
            Timestamp canceledAt,
            Integer concertSessionId,
            List<Integer> seatIds,
            Integer seatCount,
            String concertTitle,
            String concertPosterUrl,
            String venueName,
            String seatName,
            Integer price,
            String priceText,
            String statusLabel,
            Boolean isPending,
            Boolean isPaid,
            Boolean isCanceled
    ) {
        public MyPageListDTO(Booking booking) {
            this(booking, BookingSeatSummary.from(booking));
        }

        private MyPageListDTO(Booking booking, BookingSeatSummary summary) {
            this(
                    booking.getId(),
                    booking.getBookingNumber(),
                    booking.getStatus(),
                    booking.getCreatedAt(),
                    booking.getCanceledAt(),
                    booking.getConcertSession().getId(),
                    summary.seatIds(),
                    summary.seatCount(),
                    booking.getConcertSession().getConcert().getTitle(),
                    booking.getConcertSession().getConcert().getPosterUrl(),
                    booking.getConcertSession().getConcert().getVenue().getName(),
                    summary.seatName(),
                    summary.totalPrice(),
                    summary.totalPriceText(),
                    toBookingStatusLabel(booking.getStatus()),
                    booking.getStatus().isPending(),
                    booking.getStatus().isPaid(),
                    booking.getStatus().isCanceled()
            );
        }
    }

    public record PaymentDTO(
            Integer bookingId,
            String bookingNumber,
            Integer concertId,
            Integer concertSessionId,
            String concertTitle,
            String posterUrl,
            String sessionText,
            String venueText,
            List<BookingSeatDTO> selectedSeats,
            Integer seatCount,
            String seatName,
            Integer totalPrice,
            String totalPriceText,
            String ticketPriceText,
            String feeText,
            Integer userId,
            String username,
            String userEmail
    ) {
        public PaymentDTO(Booking booking) {
            this(booking, BookingSeatSummary.from(booking));
        }

        private PaymentDTO(Booking booking, BookingSeatSummary summary) {
            this(
                    booking.getId(),
                    booking.getBookingNumber(),
                    booking.getConcertSession().getConcert().getId(),
                    booking.getConcertSession().getId(),
                    booking.getConcertSession().getConcert().getTitle(),
                    booking.getConcertSession().getConcert().getPosterUrl(),
                    booking.getConcertSession().getSessionDate() + " " + booking.getConcertSession().getSessionTime(),
                    booking.getConcertSession().getConcert().getVenue().getName(),
                    toBookingSeatDTOs(summary.bookingSeats()),
                    summary.seatCount(),
                    summary.seatName(),
                    summary.totalPrice(),
                    summary.totalPriceText(),
                    summary.totalPriceText(),
                    formatPrice(0),
                    booking.getUser().getId(),
                    booking.getUser().getUsername(),
                    booking.getUser().getEmail()
            );
        }
    }

    public record BookingSeatDTO(
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
        public BookingSeatDTO(BookingSeat bookingSeat) {
            this(
                    bookingSeat.getSeat().getId(),
                    getSeatNumberSnapshot(bookingSeat),
                    parseSeatRowName(getSeatNumberSnapshot(bookingSeat)),
                    parseSeatNo(getSeatNumberSnapshot(bookingSeat)),
                    getSeatGradeSnapshot(bookingSeat),
                    formatGradeName(getSeatGradeSnapshot(bookingSeat)),
                    getSeatGradeSnapshot(bookingSeat).toLowerCase(),
                    bookingSeat.getPrice(),
                    formatPrice(bookingSeat.getPrice())
            );
        }
    }

    public record SeatFormDTO(
            List<SeatDTO> seats,
            List<SeatGradeTabDTO> gradeTabs,
            String seatsJson
    ) {
        public SeatFormDTO(List<Seat> seats) {
            this(seats, Set.of());
        }

        public SeatFormDTO(List<Seat> seats, Set<Integer> bookedSeatIds) {
            this(SeatFormSource.from(seats, bookedSeatIds));
        }

        private SeatFormDTO(SeatFormSource source) {
            this(source.seats(), source.gradeTabs(), source.seatsJson());
        }
    }

    public record SeatDTO(
            Integer id,
            String seatNumber,
            String rowName,
            String seatNo,
            String grade,
            String gradeName,
            String gradeClass,
            Integer price,
            String priceText,
            String status,
            Boolean available
    ) {
        public SeatDTO(Seat seat) {
            this(seat, false);
        }

        public SeatDTO(Seat seat, boolean alreadyBooked) {
            this(
                    seat.getId(),
                    seat.getSeatNumber(),
                    parseSeatRowName(seat.getSeatNumber()),
                    parseSeatNo(seat.getSeatNumber()),
                    seat.getGrade().name(),
                    formatGradeName(seat.getGrade().name()),
                    seat.getGrade().name().toLowerCase(),
                    seat.getPrice(),
                    formatPrice(seat.getPrice()),
                    alreadyBooked ? STATUS_CONFIRMED : seat.getStatus().name(),
                    !alreadyBooked && STATUS_AVAILABLE.equals(seat.getStatus().name())
            );
        }
    }

    public record SeatGradeTabDTO(
            String grade,
            String gradeName,
            String gradeClass,
            Boolean active
    ) {
        public SeatGradeTabDTO(String grade, boolean active) {
            this(grade, formatGradeName(grade), grade.toLowerCase(), active);
        }
    }

    public record CompleteDTO(
            Integer bookingId,
            String bookingNumber,
            Status status,
            Integer concertId,
            Integer concertSessionId,
            String concertTitle,
            String posterUrl,
            String sessionText,
            String venueText,
            List<BookingSeatDTO> selectedSeats,
            Integer seatCount,
            String seatName,
            Integer totalPrice,
            String totalPriceText,
            Integer userId,
            String username,
            Timestamp createdAt,
            Timestamp expiresAt
    ) {
        public CompleteDTO(Booking booking) {
            this(booking, null);
        }

        public CompleteDTO(Booking booking, Payment payment) {
            this(booking, payment, BookingSeatSummary.from(booking));
        }

        private CompleteDTO(Booking booking, Payment payment, BookingSeatSummary summary) {
            this(
                    booking.getId(),
                    booking.getBookingNumber(),
                    booking.getStatus(),
                    booking.getConcertSession().getConcert().getId(),
                    booking.getConcertSession().getId(),
                    booking.getConcertSession().getConcert().getTitle(),
                    booking.getConcertSession().getConcert().getPosterUrl(),
                    booking.getConcertSession().getSessionDate() + " " + booking.getConcertSession().getSessionTime(),
                    booking.getConcertSession().getConcert().getVenue().getName(),
                    toBookingSeatDTOs(summary.bookingSeats()),
                    summary.seatCount(),
                    summary.seatName(),
                    getCompleteTotalPrice(payment, summary),
                    formatPrice(getCompleteTotalPrice(payment, summary)),
                    booking.getUser().getId(),
                    booking.getUser().getUsername(),
                    booking.getCreatedAt(),
                    booking.getExpiresAt()
            );
        }
    }

    private record BookingSeatSummary(
            List<BookingSeat> bookingSeats,
            List<Integer> seatIds,
            Integer seatCount,
            String seatName,
            Integer totalPrice,
            String totalPriceText
    ) {
        private static BookingSeatSummary from(Booking booking) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);
            Integer totalPrice = calculateTotalPrice(bookingSeats);

            return new BookingSeatSummary(
                    bookingSeats,
                    toSeatIds(bookingSeats),
                    bookingSeats.size(),
                    formatSeatName(bookingSeats),
                    totalPrice,
                    formatPrice(totalPrice)
            );
        }
    }

    private record SeatFormSource(
            List<SeatDTO> seats,
            List<SeatGradeTabDTO> gradeTabs,
            String seatsJson
    ) {
        private static SeatFormSource from(List<Seat> seats, Set<Integer> bookedSeatIds) {
            List<SeatDTO> seatDTOs = toSeatDTOs(seats, bookedSeatIds);
            List<SeatGradeTabDTO> gradeTabs = toGradeTabs(seatDTOs);

            return new SeatFormSource(seatDTOs, gradeTabs, toJson(seatDTOs));
        }
    }

    private static List<BookingSeat> safeBookingSeats(Booking booking) {
        if (booking.getBookingSeats() == null) {
            return List.of();
        }

        return booking.getBookingSeats();
    }

    private static List<Integer> toSeatIds(List<BookingSeat> bookingSeats) {
        return bookingSeats.stream()
                .map(bookingSeat -> bookingSeat.getSeat().getId())
                .toList();
    }

    private static List<BookingSeatDTO> toBookingSeatDTOs(List<BookingSeat> bookingSeats) {
        return bookingSeats.stream()
                .sorted(Comparator.comparing(BookingResponse::getSeatNumberSnapshot))
                .map(BookingSeatDTO::new)
                .toList();
    }

    private static List<SeatDTO> toSeatDTOs(List<Seat> seats, Set<Integer> bookedSeatIds) {
        if (seats == null || seats.isEmpty()) {
            return List.of();
        }

        Set<Integer> safeBookedSeatIds = bookedSeatIds == null ? Set.of() : bookedSeatIds;

        return seats.stream()
                .sorted(Comparator
                        .comparingInt((Seat seat) -> seatGradeOrder(seat.getGrade().name()))
                        .thenComparing(Seat::getSeatNumber))
                .map(seat -> new SeatDTO(seat, safeBookedSeatIds.contains(seat.getId())))
                .toList();
    }

    private static List<SeatGradeTabDTO> toGradeTabs(List<SeatDTO> seats) {
        List<String> grades = seats.stream()
                .map(SeatDTO::grade)
                .distinct()
                .toList();

        return IntStream.range(0, grades.size())
                .mapToObj(index -> new SeatGradeTabDTO(grades.get(index), index == 0))
                .toList();
    }

    private static Integer calculateTotalPrice(List<BookingSeat> bookingSeats) {
        if (bookingSeats == null || bookingSeats.isEmpty()) {
            return 0;
        }

        return bookingSeats.stream()
                .mapToInt(bookingSeat -> bookingSeat.getPrice() == null ? 0 : bookingSeat.getPrice())
                .sum();
    }

    private static Integer getCompleteTotalPrice(Payment payment, BookingSeatSummary summary) {
        if (payment != null && payment.getAmount() != null) {
            return payment.getAmount();
        }

        return summary.totalPrice();
    }

    private static String formatSeatName(List<BookingSeat> bookingSeats) {
        if (bookingSeats == null || bookingSeats.isEmpty()) {
            return "";
        }

        return bookingSeats.stream()
                .map(BookingResponse::getSeatNumberSnapshot)
                .collect(Collectors.joining(", "));
    }

    private static String getSeatNumberSnapshot(BookingSeat bookingSeat) {
        if (bookingSeat.getSeatNumberSnapshot() != null && !bookingSeat.getSeatNumberSnapshot().isBlank()) {
            return bookingSeat.getSeatNumberSnapshot();
        }

        return bookingSeat.getSeat().getSeatNumber();
    }

    private static String getSeatGradeSnapshot(BookingSeat bookingSeat) {
        if (bookingSeat.getSeatGradeSnapshot() != null && !bookingSeat.getSeatGradeSnapshot().isBlank()) {
            return bookingSeat.getSeatGradeSnapshot();
        }

        return bookingSeat.getSeat().getGrade().name();
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
            return OBJECT_MAPPER.writeValueAsString(value);
        } catch (JsonProcessingException e) {
            throw new InternalServerErrorException("JSON 변환 중 오류가 발생했습니다.");
        }
    }

    private static List<PriceDTO> toPriceDTOs(List<Seat> seats) {
        if (seats == null || seats.isEmpty()) {
            return List.of();
        }

        return seats.stream()
                .collect(Collectors.toMap(
                        seat -> seat.getGrade().name(),
                        Seat::getPrice,
                        (oldPrice, newPrice) -> oldPrice
                ))
                .entrySet()
                .stream()
                .sorted(Comparator.comparingInt(entry -> seatGradeOrder(entry.getKey())))
                .map(entry -> new PriceDTO(
                        formatGradeName(entry.getKey()),
                        entry.getKey().toLowerCase(),
                        formatPrice(entry.getValue())
                ))
                .toList();
    }

    private static String toBookingStatusLabel(Status status) {
        if (status == null) {
            return "-";
        }

        return status.getLabel();
    }
}
