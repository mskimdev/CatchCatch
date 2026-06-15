package com.catchcatch.ticket.event;

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
                 Integer rewardPoint,
                 Integer pointValidMonths,
                 Timestamp startDate,
                 Timestamp endDate) {
        this.title = title;
        this.description = description;
        this.rewardPoint = rewardPoint;
        this.pointValidMonths = pointValidMonths == null ? 3 : pointValidMonths;
        this.startDate = startDate;
        this.endDate = endDate;
    }
}