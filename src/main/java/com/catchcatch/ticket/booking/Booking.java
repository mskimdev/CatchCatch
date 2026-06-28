package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.booking.enums.Status;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "booking_tb")
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concert_session_id", nullable = false)
    private ConcertSession concertSession;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingSeat> bookingSeats = new ArrayList<>();

    @Column(name = "booking_number", nullable = false, unique = true)
    private String bookingNumber;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status;

    @Column(name = "total_amount", nullable = false)
    private Integer totalAmount;

    @Column(name = "expires_at")
    private Timestamp expiresAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    @Column(name = "paid_at")
    private Timestamp paidAt;

    @Column(name = "canceled_at")
    private Timestamp canceledAt;

    @Builder
    private Booking(
            User user,
            ConcertSession concertSession,
            String bookingNumber,
            Status status,
            Integer totalAmount,
            Timestamp expiresAt
    ) {
        this.user = user;
        this.concertSession = concertSession;
        this.bookingNumber = bookingNumber;
        this.status = status == null ? Status.PENDING : status;
        this.totalAmount = totalAmount == null ? 0 : totalAmount;
        this.expiresAt = expiresAt;
    }

    public void addBookingSeat(BookingSeat bookingSeat) {
        this.bookingSeats.add(bookingSeat);
        bookingSeat.assignBooking(this);
    }

    public void updateTotalAmount(Integer totalAmount) {
        this.totalAmount = totalAmount == null ? 0 : totalAmount;
    }

    public void completePayment() {
        if (this.status != Status.PENDING) {
            throw new BadRequestException("결제 가능한 예매 상태가 아닙니다.");
        }

        this.status = Status.PAID;
        this.paidAt = new Timestamp(System.currentTimeMillis());
        this.expiresAt = null;
    }

    public void cancel() {
        if (this.status == Status.CANCELED) {
            throw new BadRequestException("이미 취소된 예매입니다.");
        }

        this.status = Status.CANCELED;
        this.canceledAt = new Timestamp(System.currentTimeMillis());
        this.expiresAt = null;
    }

    public void expire() {
        if (this.status != Status.PENDING) {
            return;
        }

        this.status = Status.EXPIRED;
        this.expiresAt = null;
    }
}
