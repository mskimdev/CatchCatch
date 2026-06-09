package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "booking_detail_tb")
public class BookingDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 사용자 ID (user_tb.id 참조)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 예매 묶음 번호 - 결제/완료 조회용
    @Column(name = "booking_detail_number", nullable = false, unique = true)
    private String bookingDetailNumber;

    // 총 결제 금액
    @Column(name = "total_amount", nullable = false)
    private Integer totalAmount;

    // 예매 묶음 상태
    @Builder.Default
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status = Status.PENDING;

    // 결제 전 좌석 임시 선점 만료 시간
    @Column(name = "expires_at")
    private Timestamp expiresAt;

    // 예매 묶음 생성 시간
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