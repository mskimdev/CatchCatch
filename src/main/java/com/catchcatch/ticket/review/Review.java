package com.catchcatch.ticket.review;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.sql.Timestamp;

@Entity
@Table(name = "review_tb")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
// 팀 프로젝트 컨벤션: 삭제 시 논리 삭제(Soft Delete) 적용
@SQLDelete(sql = "UPDATE review_tb SET is_deleted = true WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class Review {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id",nullable = false)
    private User user;

    @Column(nullable = false)
    private Double rating;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concert_id",nullable = false)
    private Concert concert;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;



    @Column(nullable = false,length = 1000)
    private String content;

    @Builder.Default
    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    // 수정 시
    public void updateReview(Double rating, String content){
        if (rating != null && rating >= 0.5 && rating <= 5.0){
            this.rating = rating;
        }
        if (content != null && !content.isBlank()){
            this.content = content;
        }
    }

}
