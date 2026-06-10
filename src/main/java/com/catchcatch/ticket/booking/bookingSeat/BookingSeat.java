package com.catchcatch.ticket.booking.bookingSeat;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.seat.Seat;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "booking_seat_tb")
public class BookingSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 어떤 예매에 포함된 좌석인지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    // 어떤 좌석인지
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    // 예매 당시 좌석 가격
    @Column(name = "price", nullable = false)
    private Integer price;

    // 예매 당시 좌석 번호 스냅샷
    @Column(name = "seat_number_snapshot", nullable = false, length = 20)
    private String seatNumberSnapshot;

    // 예매 당시 좌석 등급 스냅샷
    @Column(name = "seat_grade_snapshot", nullable = false, length = 20)
    private String seatGradeSnapshot;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;
}