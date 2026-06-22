package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.inquiry.enums.InquiryCategory;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "inquiry_tb")
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Data
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
    private boolean isPublic = false;

    @ColumnDefault("false")
    @Column(nullable = false)
    private boolean notifyEmail = false;

    @ColumnDefault("false")
    @Column(nullable = false)
    private boolean notifySms = false;

    private String reply;

    @CreationTimestamp
    private Timestamp createdAt;

    public void reply(String reply) {
        this.reply = reply;
        this.status = InquiryStatus.RESOLVED;
    }
}
