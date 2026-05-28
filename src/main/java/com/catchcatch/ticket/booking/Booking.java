package com.catchcatch.ticket.booking;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Data
@Entity
@Table(name = "booking_tb")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Booking {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 예매한 사용자 ID
    @Column(name = "user_id", nullable = false)
    private Integer userId;

    // 예매한 공연 회차 ID
    @Column(name = "concert_session_id", nullable = false)
    private Integer concertSessionId;

    // 예매한 좌석 ID
    @Column(name = "seat_id", nullable = false)
    private Integer seatId;

    // 예매 번호 - 사용자 조회 및 티켓 확인용
    @Column(name = "booking_number", nullable = false, unique = true)
    private String bookingNumber;

    // 예매 상태 - PENDING, PAID, CANCELED, EXPIRED
    @Column(name = "status", nullable = false)
    private String status;

    // 결제 전 좌석 임시 선점 만료 시간
    @Column(name = "expires_at")
    private Timestamp expiresAt;

    // 예매 생성 시간
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    // 결제 완료 시간
    @Column(name = "paid_at")
    private Timestamp paidAt;

    // 예매 취소 시간
    @Column(name = "canceled_at")
    private Timestamp canceledAt;
}