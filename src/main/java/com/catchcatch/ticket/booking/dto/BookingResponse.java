package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.session.ConcertSession;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Builder;
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

    /**
     * 예매 정보 화면용 DTO
     */
    @Getter
    @Builder
    public static class InfoDTO {
        private Integer id;
        private String title;
        private String posterUrl;
        private String genreLabel;
        private String genre;

        private Integer sessionId;
        private String sessionText;
        private String venueName;

        private String ageLimit;
        private String runtime;
        private String organizer;
        private String contact;

        // 좌석 가격
        private List<PriceDTO> prices;

        public static InfoDTO from(Concert concert, ConcertSession concertSession, List<Seat> seats) {
            return InfoDTO.builder()
                    .id(concert.getId())
                    .title(concert.getTitle())
                    .posterUrl(concert.getPosterUrl())
                    .genreLabel(concert.getGenreLabel())
                    .genre(concert.getGenreCode())
                    .sessionId(concertSession.getId())
                    .sessionText(concertSession.getSessionDate() + " " + concertSession.getSessionTime())
                    .venueName(concert.getVenue().getName())
                    .ageLimit(concert.getAgeLimit())
                    .runtime(concert.getRuntime())
                    .organizer(concert.getOrganizer())
                    .contact(concert.getContact())
                    .prices(toPriceDTOs(seats))
                    .build();
        }
    }

    // seat에 있는 좌석 가격
    @Getter
    @Builder
    public static class PriceDTO {
        private String gradeName;
        private String gradeClass;
        private String priceText;
    }

    @Getter
    public static class DetailDTO {
        private Integer id;
        private Integer userId;
        private Integer concertSessionId;

        private String ticketToken;
        private String ticketCode;
        private Boolean canUseTicket;

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

        // 추가: 공연 정보
        private String concertTitle;
        private String sessionText;
        private String venueName;
        private String venueAddress;

        // 추가: 결제 상세 이동용
        private Integer paymentId;          // DB payment id
        private String portOnePaymentId;    // 포트원 결제 코드
        private Boolean hasPayment;

        // 추가: 예약자 정보
        private String reserverName;
        private String reserverPhone;
        private String reserverEmail;


        public DetailDTO(Booking booking) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);
            ConcertSession concertSession = booking.getConcertSession();

            this.id = booking.getId();
            this.userId = booking.getUser().getId();
            this.concertSessionId = concertSession.getId();

            this.seatIds = bookingSeats.stream()
                    .map(bookingSeat -> bookingSeat.getSeat().getId())
                    .toList();

            this.seatCount = bookingSeats.size();
            this.seatName = formatSeatName(bookingSeats);

            this.bookingNumber = booking.getBookingNumber();
            this.status = booking.getStatus();
            this.ticketToken = booking.getTicketToken();
            this.ticketCode = booking.getTicketCode();
            this.canUseTicket = booking.getStatus() == Status.PAID
                    && booking.getCanceledAt() == null
                    && booking.getTicketToken() != null
                    && !booking.getTicketToken().isBlank();

            this.totalPrice = calculateTotalPrice(bookingSeats);
            this.totalPriceText = formatPrice(this.totalPrice);

            this.expiresAt = booking.getExpiresAt();
            this.createdAt = booking.getCreatedAt();
            this.canceledAt = booking.getCanceledAt();

            // 공연 정보
            this.concertTitle = concertSession.getConcert().getTitle();
            this.sessionText = formatSessionText(concertSession);
            this.venueName = concertSession.getConcert().getVenue().getName();
            this.venueAddress = concertSession.getConcert().getVenue().getAddress();

            // 예약자 정보
            this.reserverName = booking.getUser().getUsername();
            this.reserverPhone = maskPhone(booking.getUser().getPhone());
            this.reserverEmail = maskEmail(booking.getUser().getEmail());

            // 기본값
            // 기본값
            this.paymentId = null;
            this.portOnePaymentId = null;
            this.hasPayment = false;
        }

        public DetailDTO(Booking booking, Payment payment) {
            this(booking);

            if (payment != null) {
                this.paymentId = payment.getId();              // DB 결제 id
                this.portOnePaymentId = payment.getPaymentId(); // 포트원 결제 코드
                this.hasPayment = true;
            }
        }

        private static String formatSessionText(ConcertSession concertSession) {
            String date = concertSession.getSessionDate().toString();
            String time = concertSession.getSessionTime().toString();

            if (concertSession.getRound() != null && !concertSession.getRound().isBlank()) {
                return date + " " + time + " (" + concertSession.getRound() + ")";
            }

            return date + " " + time;
        }

        private static String maskPhone(String phone) {
            if (phone == null || phone.isBlank()) {
                return "-";
            }

            if (phone.length() < 8) {
                return phone;
            }

            return phone.replaceAll("(\\d{3})-?(\\d{2})\\d{2}-?(\\d{2})\\d{2}", "$1-$2**-$3**");
        }

        private static String maskEmail(String email) {
            if (email == null || !email.contains("@")) {
                return "-";
            }

            String[] parts = email.split("@");

            if (parts.length != 2) {
                return email;
            }

            String name = parts[0];
            String domain = parts[1];

            if (name.length() <= 2) {
                return name.charAt(0) + "****@" + domain;
            }

            return name.substring(0, 2) + "****@" + domain;
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

    /**
     * 관리자 - 예매 관리 목록 화면 DTO
     *
     * admin/booking/list.mustache에서
     * {{bookingId}}, {{userName}}, {{userId}}, {{concertTitle}}, {{createdAt}}, {{isCancelled}}
     * 형태로 사용한다.
     */
    @Getter
    public static class AdminListDTO {
        private Integer bookingId;
        private Integer userId;
        private String userName;
        private String concertTitle;
        private String createdAt;
        private Boolean isCancelled;

        public AdminListDTO(Booking booking) {
            this.bookingId = booking.getId();
            this.userId = booking.getUser().getId();
            this.userName = booking.getUser().getUsername();
            this.concertTitle = booking.getConcertSession().getConcert().getTitle();
            this.createdAt = booking.getCreatedAt() == null ? "" : booking.getCreatedAt().toString();
            this.isCancelled = booking.getStatus() == Status.CANCELED;
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
        private String sessionText;

        private List<Integer> seatIds;
        private Integer seatCount;

        private String concertTitle;
        private String concertPosterUrl;
        private String venueName;

        private String seatName;

        private Integer price;
        private String priceText;

        private String statusLabel;
        private Boolean isPending;
        private Boolean isPaid;
        private Boolean isCanceled;

        public MyPageListDTO(Booking booking) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            ConcertSession concertSession = booking.getConcertSession();

            this.id = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.status = booking.getStatus();
            this.createdAt = booking.getCreatedAt();
            this.canceledAt = booking.getCanceledAt();

            this.concertSessionId = concertSession.getId();
            this.sessionText = formatSessionText(concertSession);

            this.seatIds = bookingSeats.stream()
                    .map(bookingSeat -> bookingSeat.getSeat().getId())
                    .toList();

            this.seatCount = bookingSeats.size();

            this.concertTitle = concertSession.getConcert().getTitle();
            this.concertPosterUrl = concertSession.getConcert().getPosterUrl();
            this.venueName = concertSession.getConcert().getVenue().getName();

            this.seatName = formatSeatName(bookingSeats);

            this.price = calculateTotalPrice(bookingSeats);
            this.priceText = formatPrice(this.price);

            this.statusLabel = toBookingStatusLabel(booking.getStatus());

            this.isPending = booking.getStatus() == Status.PENDING;
            this.isPaid = booking.getStatus() == Status.PAID;
            this.isCanceled = booking.getStatus() == Status.CANCELED;
        }

        private static String formatSessionText(ConcertSession concertSession) {
            String date = concertSession.getSessionDate().toString();
            String time = concertSession.getSessionTime().toString();

            if (concertSession.getRound() != null && !concertSession.getRound().isBlank()) {
                return date + " " + time + " (" + concertSession.getRound() + ")";
            }

            return date + " " + time;
        }
    }

    /**
     * 결제 화면 DTO
     *
     * booking/payment-form.mustache 또는 payment/payment-form.mustache에서
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
        private static final String DEFAULT_SEATMAP_IMAGE_URL = "/temp/seatmap/seat/seatmap-image.png";

        private List<SeatDTO> seats;
        private List<SeatGradeTabDTO> gradeTabs;
        private String seatsJson;
        private String overviewImageUrl;

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
            this.overviewImageUrl = DEFAULT_SEATMAP_IMAGE_URL;
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

    // ===========================================
    // private
    // ===========================================

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

    // 좌석 가격
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
                .map(entry -> PriceDTO.builder()
                        .gradeName(formatGradeName(entry.getKey()))
                        .gradeClass(entry.getKey().toLowerCase())
                        .priceText(formatPrice(entry.getValue()))
                        .build())
                .toList();
    }

    private static String toBookingStatusLabel(Status status) {
        if (status == null) {
            return "-";
        }

        return switch (status) {
            case PENDING -> "결제대기";
            case PAID -> "예약확정";
            case CANCELED -> "취소됨";
            case EXPIRED -> "만료됨";
        };
    }

    /**
     * 예매 완료 화면 DTO
     *
     * booking/complete.mustache에서
     * {{complete.bookingNumber}}, {{complete.concertTitle}},
     * {{complete.selectedSeats}}, {{complete.totalPriceText}}
     * 형태로 사용한다.
     */
    @Getter
    public static class CompleteDTO {
        private Integer bookingId;
        private String bookingNumber;
        private Status status;

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

        private Integer userId;
        private String username;

        private Timestamp createdAt;
        private Timestamp expiresAt;

        public CompleteDTO(Booking booking) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            this.bookingId = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.status = booking.getStatus();

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

            this.userId = booking.getUser().getId();
            this.username = booking.getUser().getUsername();

            this.createdAt = booking.getCreatedAt();
            this.expiresAt = booking.getExpiresAt();
        }

        public CompleteDTO(Booking booking, Payment payment) {
            List<BookingSeat> bookingSeats = safeBookingSeats(booking);

            this.bookingId = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.status = booking.getStatus();

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

            // 💡 중요: 가격을 좌석 총합이 아니라, payment에 저장된 실제 결제 금액(amount)으로 세팅합니다.
            // 포인트 적용 전 오리지널 금액이 필요하다면 payment.getOriginalAmount()를 쓰셔도 됩니다.
            this.totalPrice = payment.getAmount();
            this.totalPriceText = formatPrice(this.totalPrice);

            this.userId = booking.getUser().getId();
            this.username = booking.getUser().getUsername();

            this.createdAt = booking.getCreatedAt();
            this.expiresAt = booking.getExpiresAt();
        }
    }
}
