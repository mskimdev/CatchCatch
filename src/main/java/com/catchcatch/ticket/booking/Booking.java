package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Entity
@Table(name = "booking_tb")
@ToString
public class Booking {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 예매한 사용자
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 예매한 공연 회차
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "concert_session_id", nullable = false)
    private ConcertSession concertSession;

    // 예매에 포함된 좌석 목록
    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingSeat> bookingSeats = new ArrayList<>();

    // 예매 번호 - 사용자 조회 및 티켓 확인용
    @Column(name = "booking_number", nullable = false, unique = true)
    private String bookingNumber;

    // 예매 상태 - PENDING, PAID, CANCELED, EXPIRED
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private Status status;

    // 총 결제 금액
    @Column(name = "total_amount", nullable = false)
    private Integer totalAmount;

    // 결제 전 좌석 임시 선점 만료 시간
    @Column(name = "expires_at")
    private Timestamp expiresAt;

    // 예매 생성 시간
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    // 결제 완료 시간
    @Column(name = "paid_at")
    private Timestamp paidAt;

    // 예매 취소 시간
    @Column(name = "canceled_at")
    private Timestamp canceledAt;

    @Builder
    public Booking(
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

    /**
     * 예매에 좌석 추가
     *
     * Booking 1개에 BookingSeat 여러 개를 연결한다.
     */
    public void addBookingSeat(BookingSeat bookingSeat) {
        this.bookingSeats.add(bookingSeat);
        bookingSeat.setBooking(this);
    }

    /**
     * 총 금액 변경
     *
     * BookingSeat 가격 합계를 계산한 뒤 저장할 때 사용.
     */
    public void updateTotalAmount(Integer totalAmount) {
        this.totalAmount = totalAmount == null ? 0 : totalAmount;
    }

    /**
     * 결제 완료 처리
     */
    public void completePayment() {
        if (this.status != Status.PENDING) {
            throw new IllegalStateException("결제 가능한 예매 상태가 아닙니다.");
        }

        this.status = Status.PAID;
        this.paidAt = new Timestamp(System.currentTimeMillis());
        this.expiresAt = null;
    }

    /**
     * 예매 취소 처리
     */
    public void cancel() {
        if (this.status == Status.CANCELED) {
            throw new IllegalStateException("이미 취소된 예매입니다.");
        }

        this.status = Status.CANCELED;
        this.canceledAt = new Timestamp(System.currentTimeMillis());
    }

    /**
     * 예매 만료 처리
     */
    public void expire() {
        if (this.status != Status.PENDING) {
            return;
        }

        this.status = Status.EXPIRED;
    }
}