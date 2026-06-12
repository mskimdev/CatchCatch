package com.catchcatch.ticket.point;

import com.catchcatch.ticket.eventhistory.EventHistory;
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
@Table(name = "point_tb")
public class Point {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 포인트 소유 사용자
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 이벤트 적립이면 존재, 결제 사용이면 null 가능
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "event_history_id")
    private EventHistory eventHistory;

    // 양수: 적립, 음수: 사용
    @Column(nullable = false)
    private Integer amount;

    // 이 거래 이후 잔액
    @Column(nullable = false)
    private Integer balance;

    @Column(name = "expired_at")
    private Timestamp expiredAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    @Builder
    public Point(User user, EventHistory eventHistory, Integer amount, Integer balance, Timestamp expiredAt) {
        this.user = user;
        this.eventHistory = eventHistory;
        this.amount = amount;
        this.balance = balance;
        this.expiredAt = expiredAt;
    }
}