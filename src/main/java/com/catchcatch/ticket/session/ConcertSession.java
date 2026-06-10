package com.catchcatch.ticket.session;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.seat.Seat;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "concert_session_tb")
@SQLDelete(sql = "UPDATE concert_session_tb SET is_deleted = true WHERE id = ?")
@SQLRestriction("is_deleted = false")
public class ConcertSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    /**
     * concert_session_tb.concert_id -> concert_tb.id
     *
     * Concert 1 : N ConcertSession
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concert_id", nullable = false)
    private Concert concert;

    /**
     * 회차 날짜
     */
    @Column(name = "session_date", nullable = false)
    private LocalDate sessionDate;

    /**
     * 회차 시간
     */
    @Column(name = "session_time", nullable = false)
    private LocalTime sessionTime;

    /**
     * 이 회차에 속한 좌석 목록
     *
     * ConcertSession 1 : N Seat
     */
    @OneToMany(mappedBy = "concertSession")
    private List<Seat> seats = new ArrayList<>();

    /**
     * 이 회차에 생성된 예매 목록
     *
     * ConcertSession 1 : N Booking
     */
    @OneToMany(mappedBy = "concertSession")
    private List<Booking> bookings = new ArrayList<>();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    @Column(name = "is_deleted", nullable = false)
    private boolean isDeleted = false;

    @Builder
    public ConcertSession(Concert concert, LocalDate sessionDate, LocalTime sessionTime) {
        this.concert = concert;
        this.sessionDate = sessionDate;
        this.sessionTime = sessionTime;
        this.isDeleted = false;
    }
}