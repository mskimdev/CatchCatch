package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Booking;
import lombok.Getter;

import java.sql.Timestamp;

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
            this.concertSessionId = booking.getConcertSessionId();
            this.seatId = booking.getSeatId();
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
            this.concertSessionId = booking.getConcertSessionId();
            this.seatId = booking.getSeatId();
            this.status = booking.getStatus();
            this.createdAt = booking.getCreatedAt();
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

        public CompleteDTO(Booking booking) {
            this.bookingId = booking.getId();
            this.bookingNumber = booking.getBookingNumber();
            this.concertSessionId = booking.getConcertSessionId();
            this.seatId = booking.getSeatId();
            this.status = booking.getStatus();
            this.createdAt = booking.getCreatedAt();
        }
    }
}