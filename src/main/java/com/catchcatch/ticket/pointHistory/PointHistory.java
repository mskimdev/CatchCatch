package com.catchcatch.ticket.pointHistory;

import com.catchcatch.ticket.eventhistory.EventHistory;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.pointHistory.enums.PointHistoryType;
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_history_id")
    private EventHistory eventHistory;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id")
    private Payment payment;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PointHistoryType type;

    @Column(nullable = false)
    private Integer amount;

    @Column(nullable = false)
    private Integer balance;

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