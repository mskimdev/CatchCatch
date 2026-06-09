package com.catchcatch.ticket.queue;

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
@Table(name = "queue_tb")
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class WaitingQueue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 사용자 ID (user_tb.id 참조)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 어떤 공연 회차의 대기열인지 구분하는 ID
    @Column(name = "concert_session_id", nullable = false)
    private Integer concertSessionId;

    // 사용자에게 발급된 대기 순번
    @Column(name = "queue_number", nullable = false)
    private Integer queueNumber;

    // 대기열 상태 - WAITING, READY, ENTERED, EXPIRED, CANCELLED
    @Builder.Default
    @Column(name = "status", nullable = false)
    private String status = "WAITING";

    // 순번이 도달했을 때 발급되는 입장 토큰
    @Column(name = "entry_token", unique = true)
    private String entryToken;

    // 입장 토큰 만료 시간 - 문서 기준 발급 후 10분 유효
    @Column(name = "token_expires_at")
    private Timestamp tokenExpiresAt;

    // 대기열 등록 시간
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    // 실제 예매 화면 입장 시간
    @Column(name = "entered_at")
    private Timestamp enteredAt;

    // 대기열 만료 시간
    @Column(name = "expired_at")
    private Timestamp expiredAt;
}