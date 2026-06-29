package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.inquiry.enums.InquiryCategory;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "inquiry_tb")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Getter
public class Inquiry {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(nullable = false)
    private String content;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    private InquiryCategory category;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'PENDING'")
    @Builder.Default
    private InquiryStatus status = InquiryStatus.PENDING;

    @ColumnDefault("false")
    @Column(nullable = false)
    private boolean isPublic;

    @ColumnDefault("false")
    @Column(nullable = false)
    private boolean notifyEmail;

    @ColumnDefault("false")
    @Column(nullable = false)
    private boolean notifySms;

    private String reply;

    @CreationTimestamp
    private Timestamp createdAt;

    public void update(InquiryCategory category, String title, String content,
                       boolean isPublic, boolean notifyEmail, boolean notifySms) {
        this.category = category;
        this.title = title;
        this.content = content;
        this.isPublic = isPublic;
        this.notifyEmail = notifyEmail;
        this.notifySms = notifySms;
    }

    public void reply(String reply) {
        this.reply = reply;
        this.status = InquiryStatus.RESOLVED;
    }
}
