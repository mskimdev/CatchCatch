package com.catchcatch.ticket.notification;

import com.catchcatch.ticket.notification.enums.NotificationType;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "notification_tb")
@Getter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 알림 받을 사용자
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 알림 종류
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 50)
    private NotificationType type;

    // 알림 제목
    @Column(nullable = false, length = 100)
    private String title;

    // 알림 내용
    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    // 클릭 시 이동할 주소
    @Column(nullable = false)
    private String targetUrl;

    // 읽음 여부
    @ColumnDefault("false")
    @Column(name = "is_read", nullable = false)
    @Builder.Default
    private boolean read = false;

    @CreationTimestamp
    private Timestamp createdAt;

    public void markAsRead() {
        this.read = true;
    }
}