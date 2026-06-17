package com.catchcatch.ticket.pointHistory;

import com.catchcatch.ticket.eventhistory.EventHistory;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.pointHistory.PointHistoryType;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "point_history_tb")
public class PointHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 포인트 소유 사용자
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 어떤 이벤트 적립분인지
    // EARN, USE, EXPIRE 모두 들어갈 수 있음
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_history_id")
    private EventHistory eventHistory;

    // 결제에서 포인트를 사용한 경우 존재
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PointHistoryType type;

    // 이번 거래 변동량
    // 적립: 양수, 사용/만료: 음수
    @Column(nullable = false)
    private Integer amount;

    // 해당 이벤트 적립분의 거래 후 남은 잔액
    // 예: 1000P 적립 후 300P 사용하면 USE row의 balance는 700
    @Column(nullable = false)
    private Integer balance;

    // 해당 이벤트 적립분의 만료일
    @Column(name = "expired_at")
    private Timestamp expiredAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    @Builder
    public PointHistory(User user,
                        EventHistory eventHistory,
                        Payment payment,
                        PointHistoryType type,
                        Integer amount,
                        Integer balance,
                        Timestamp expiredAt) {
        this.user = user;
        this.eventHistory = eventHistory;
        this.payment = payment;
        this.type = type;
        this.amount = amount;
        this.balance = balance;
        this.expiredAt = expiredAt;
    }
}