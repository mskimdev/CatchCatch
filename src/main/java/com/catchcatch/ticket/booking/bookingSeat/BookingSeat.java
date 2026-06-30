package com.catchcatch.ticket.booking.bookingSeat;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.seat.Seat;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "booking_seat_tb")
public class BookingSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @Column(name = "price", nullable = false)
    private Integer price;

    @Column(name = "seat_number_snapshot", nullable = false, length = 20)
    private String seatNumberSnapshot;

    @Column(name = "seat_grade_snapshot", nullable = false, length = 20)
    private String seatGradeSnapshot;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder(access = AccessLevel.PRIVATE)
    private BookingSeat(
            Seat seat,
            Integer price,
            String seatNumberSnapshot,
            String seatGradeSnapshot
    ) {
        this.seat = seat;
        this.price = price;
        this.seatNumberSnapshot = seatNumberSnapshot;
        this.seatGradeSnapshot = seatGradeSnapshot;
    }

    public static BookingSeat create(Seat seat) {
        return BookingSeat.builder()
                .seat(seat)
                .price(seat.getPrice())
                .seatNumberSnapshot(seat.getSeatNumber())
                .seatGradeSnapshot(seat.getGrade().name())
                .build();
    }

    public void assignBooking(Booking booking) {
        this.booking = booking;
    }
}
