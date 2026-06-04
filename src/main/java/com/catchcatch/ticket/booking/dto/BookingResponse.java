package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.concert.Concert;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.user.User;
import lombok.Getter;

import java.sql.Timestamp;
import java.util.List;
import java.util.stream.Collectors;

public class BookingResponse {

    // 예매 상세 조회 DTO
    @Getter
    public static class DetailDTO {
        private Integer id;
        private Integer userId;
        private Integer concertSessionId;
        private Integer seatId;
        private String bookingNumber;
        private String status;
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

    // 예매 목록 조회 DTO
    @Getter
    public static class ListDTO {
        private Integer id;
        private String bookingNumber;
        private Integer concertSessionId;
        private Integer seatId;
        private String status;
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

    // 마이페이지 예매 내역 화면용 DTO
    @Getter
    public static class MyPageListDTO {
        private Integer id;
        private String bookingNumber;
        private Timestamp createdAt;

        private String concertTitle;
        private String posterUrl;
        private String sessionText;
        private String venueName;
        private String seatNumber;
        private String grade;
        private String priceText;

        private boolean isPaid;
        private boolean isCanceled;
        private String statusLabel;

        public MyPageListDTO(Booking booking) {
            this.id            = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.createdAt     = booking.getCreatedAt();
            this.isPaid        = "PAID".equals(booking.getStatus());
            this.isCanceled    = "CANCELED".equals(booking.getStatus());
            this.statusLabel   = switch (booking.getStatus()) {
                case "PAID"     -> "예매 완료";
                case "CANCELED" -> "취소됨";
                case "PENDING"  -> "결제 대기";
                case "EXPIRED"  -> "만료됨";
                default         -> booking.getStatus();
            };

            ConcertSession session = booking.getConcertSession();
            Concert concert = session.getConcert();
            this.concertTitle = concert.getTitle();
            this.posterUrl    = concert.getPosterUrl();
            this.sessionText  = session.getSessionDate() + " " + session.getSessionTime();
            this.venueName    = concert.getVenue().getName();

            var seat = booking.getSeat();
            this.seatNumber = seat.getSeatNumber();
            this.grade      = seat.getGrade().name();
            this.priceText  = String.format("%,d원", seat.getPrice());
        }
    }

    // 결제 화면 출력용 DTO
    @Getter
    public static class PaymentDTO {
        private Integer bookingId;       // 예매 PK ID - 결제 전 단계에서는 임시값 0 사용
        private String merchantUid;      // 결제 주문번호 - 실제 PG 연동 전에는 임시 주문번호

        private String seatIds;          // 선택한 좌석 ID 목록 - 예: "28,29,30,31"
        private Integer seatCount;       // 선택한 좌석 수

        private String concertTitle;     // 결제 화면에 표시할 공연명
        private String seatName;         // 선택 좌석명 표시용 문자열
        private Integer price;           // 첫 번째 좌석 가격 또는 대표 가격

        private Integer totalPrice;      // 최종 결제 금액 숫자값
        private String totalPriceText;   // 최종 결제 금액 표시용 문자열
        private String ticketPriceText;  // 티켓 금액 표시용 문자열
        private String feeText;          // 예매 수수료 표시용 문자열

        private Integer userId;          // 예매자 사용자 ID
        private String username;         // 예매자 이름 또는 로그인 아이디

        public PaymentDTO(String seatIds, List<Seat> seats, User sessionUser) {
            int totalPrice = seats.stream()
                    .mapToInt(Seat::getPrice)
                    .sum();

            this.bookingId = 0;
            this.merchantUid = "ORDER-" + System.currentTimeMillis();

            this.seatIds = seatIds;
            this.seatCount = seats.size();

            // TODO: 추후 concert/session/venue 조회값으로 교체
            this.concertTitle = "테스트 콘서트";

            this.seatName = seats.stream()
                    .map(Seat::getSeatNumber)
                    .collect(Collectors.joining(", "));

            this.price = seats.isEmpty() ? 0 : seats.get(0).getPrice();

            this.totalPrice = totalPrice;
            this.totalPriceText = String.format("%,d원", totalPrice);
            this.ticketPriceText = String.format("%,d원", totalPrice);
            this.feeText = "0원";

            this.userId = sessionUser.getId();
            this.username = sessionUser.getUsername();
        }
    }

    // 예매 완료 화면 DTO
    @Getter
    public static class CompleteDTO {
        private Integer bookingId;
        private String bookingNumber;
        private Integer concertSessionId;
        private Integer seatId;
        private String status;
        private Timestamp createdAt;

        private String concertTitle;
        private String seatName;
        private Integer price;
        private String totalPriceText;

        private Integer userId;
        private String username;

        public CompleteDTO(Booking booking, Seat seat, User sessionUser, String concertTitle) {
            this.bookingId = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.concertSessionId = booking.getConcertSession().getId();
            this.seatId = booking.getSeat().getId();
            this.status = booking.getStatus();
            this.createdAt = booking.getCreatedAt();

            this.concertTitle = concertTitle;

            this.seatName = seat.getSeatNumber();
            this.price = seat.getPrice();
            this.totalPriceText = String.format("%,d원", seat.getPrice());

            this.userId = sessionUser.getId();
            this.username = sessionUser.getUsername();
        }
    }
}