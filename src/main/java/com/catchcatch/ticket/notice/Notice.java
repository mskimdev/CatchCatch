package com.catchcatch.ticket.notice;

import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "notice_tb")
@Data
@NoArgsConstructor
public class Notice {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ColumnDefault("false")
    @Column(nullable = false)
    private boolean isPinned = false;

    @ColumnDefault("0")
    @Column(nullable = false)
    private int viewCount = 0;

    @CreationTimestamp
    private Timestamp createdAt;

    @UpdateTimestamp
    private Timestamp updatedAt;

    @Builder
    public Notice(boolean isPinned, String title, String content) {
        this.isPinned = isPinned;
        this.title = title;
        this.content = content;
    }

    public void update(NoticeRequest.UpdateDTO reqDTO) {
        this.isPinned = Boolean.TRUE.equals(reqDTO.isPinned());
        this.title = reqDTO.title();
        this.content = reqDTO.sanitizedContent();
    }
}
