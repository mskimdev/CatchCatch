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

    @Column(name = "reward_point", nullable = false)
    private Integer rewardPoint;

    @Column(name = "start_date", nullable = false)
    private Timestamp startDate;

    @Column(name = "end_date", nullable = false)
    private Timestamp endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private EventStatus status;

    @Builder
    public Event(String title, Integer rewardPoint, Timestamp startDate, Timestamp endDate, EventStatus status) {
        this.title = title;
        this.rewardPoint = rewardPoint;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = status == null ? EventStatus.ACTIVE : status;
    }
}