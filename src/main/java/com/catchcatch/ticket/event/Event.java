package com.catchcatch.ticket.event;

import com.catchcatch.ticket.event.enums.ConditionType;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.sql.Timestamp;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "event_tb")
public class Event {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(length = 1000)
    private String description;

    // Quill 에디터 HTML 콘텐츠 (유의사항, 상세 안내 등)
    @Column(name = "notice_content", columnDefinition = "TEXT")
    private String noticeContent;

    // 이벤트 썸네일 이미지 URL
    @Column(name = "image_url", length = 500)
    private String imageUrl;

    // 참여 조건 유형
    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 30)
    private ConditionType conditionType;

    // SPECIFIC_CONCERT 조건일 때 대상 콘서트 ID
    @Column(name = "condition_concert_id")
    private Integer conditionConcertId;

    @Column(name = "reward_point", nullable = false)
    private Integer rewardPoint;

    @Column(name = "point_valid_months", nullable = false)
    private Integer pointValidMonths;

    @Column(name = "start_date", nullable = false)
    private Timestamp startDate;

    @Column(name = "end_date", nullable = false)
    private Timestamp endDate;

    @Builder
    public Event(String title,
                 String description,
                 String noticeContent,
                 String imageUrl,
                 ConditionType conditionType,
                 Integer conditionConcertId,
                 Integer rewardPoint,
                 Integer pointValidMonths,
                 Timestamp startDate,
                 Timestamp endDate) {
        this.title = title;
        this.description = description;
        this.noticeContent = noticeContent;
        this.imageUrl = imageUrl;
        this.conditionType = conditionType == null ? ConditionType.NONE : conditionType;
        this.conditionConcertId = conditionConcertId;
        this.rewardPoint = rewardPoint;
        this.pointValidMonths = pointValidMonths == null ? 3 : pointValidMonths;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public void update(String title,
                       String description,
                       String noticeContent,
                       String imageUrl,
                       ConditionType conditionType,
                       Integer conditionConcertId,
                       Integer rewardPoint,
                       Integer pointValidMonths,
                       Timestamp startDate,
                       Timestamp endDate) {
        this.title = title;
        this.description = description;
        this.noticeContent = noticeContent;
        this.imageUrl = imageUrl;
        this.conditionType = conditionType == null ? ConditionType.NONE : conditionType;
        this.conditionConcertId = conditionConcertId;
        this.rewardPoint = rewardPoint;
        this.pointValidMonths = pointValidMonths == null ? 3 : pointValidMonths;
        this.startDate = startDate;
        this.endDate = endDate;
    }

    public boolean isActive() {
        long now = System.currentTimeMillis();
        return this.startDate.getTime() <= now && now <= this.endDate.getTime();
    }
}