package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.user.User;
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

    // 사용자 ID (user_tb.id 참조)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne
    @JoinColumn(name = "concert_session_id", nullable = false)
    private ConcertSession concertSession;


    @ManyToOne
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    // 예매 번호 - 사용자 조회 및 티켓 확인용
    @Column(name = "booking_number", nullable = false, unique = true)
    private String bookingNumber;

    // 예매 상태
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status = Status.PENDING;

    // 결제 전 좌석 임시 선점 만료 시간
    @Column(name = "expires_at")
    private Timestamp expiresAt;

    // 예매 생성 시간
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    // 예매 취소 시간
    @Column(name = "canceled_at")
    private Timestamp canceledAt;


}