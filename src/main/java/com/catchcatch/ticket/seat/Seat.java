package com.catchcatch.ticket.seat;

import com.catchcatch.ticket.session.ConcertSession;
import jakarta.persistence.*;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.UpdateTimestamp;

import java.sql.Timestamp;

@Entity
@Table(name = "seat_tb")
public class Seat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "session_id", nullable = false)
    private ConcertSession concertSession;

    @Column(nullable = false, length = 10)
    private String seatNumber;

    @Column(nullable = false, length = 10)
    private String grade;

    @Column(nullable = false)
    private Integer price;

    // AVAILABLE / HELD / SOLD
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @ColumnDefault("'AVAILABLE'")
    private SeatStatus status;

    @UpdateTimestamp
    private Timestamp updatedAt;
}
