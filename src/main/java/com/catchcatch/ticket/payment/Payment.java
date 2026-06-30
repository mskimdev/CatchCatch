package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.payment.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "payment_tb",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_payment_booking", columnNames = "booking_id"),
                @UniqueConstraint(name = "uk_payment_payment_id", columnNames = "payment_id")
        }
)
@Entity
public class Payment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "payment_id", nullable = false, length = 100)
    private String paymentId;

    @Column(name = "pg_tx_id", length = 100)
    private String pgTxId;

    @Column(name = "original_amount", nullable = false)
    private Integer originalAmount;

    @Column(name = "ticket_fee", nullable = false)
    private Integer ticketFee;

    @Column(name = "used_point", nullable = false)
    private Integer usedPoint;

    @Column(nullable = false)
    private Integer amount;

    @Column(nullable = false, length = 30)
    private String method;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'READY'")
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.READY;

    @Column(name = "paid_at")
    private Timestamp paidAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private Timestamp createdAt;

    @Builder
    public Payment(
            Booking booking,
            String paymentId,
            Integer originalAmount,
            Integer ticketFee,
            Integer usedPoint,
            Integer amount,
            String method
    ) {
        this.booking = booking;
        this.paymentId = paymentId;
        this.originalAmount = originalAmount;
        this.ticketFee = ticketFee;
        this.usedPoint = usedPoint;
        this.amount = amount;
        this.method = method;
    }

    public void complete(String pgTxId) {
        if (this.status != PaymentStatus.READY) {
            throw new IllegalStateException("결제 대기 상태가 아닙니다.");
        }

        this.pgTxId = pgTxId;
        this.status = PaymentStatus.PAID;
        this.paidAt = new Timestamp(System.currentTimeMillis());
    }

    public void cancel() {
        if (this.status == PaymentStatus.CANCELED) {
            throw new IllegalStateException("이미 취소된 결제입니다.");
        }

        this.status = PaymentStatus.CANCELED;
    }


    public Integer getUserId() {
        return this.booking.getUser().getId();
    }


    public void changeStatus(PaymentStatus status) {
        if (this.status != PaymentStatus.READY) {
            throw new BadRequestException("결제 대기 상태가 아닙니다.");
        }
        this.status = status;
    }

    public void changePrepareInfo(String method,
                                  Integer originalAmount,
                                  Integer ticketFee,
                                  Integer usedPoint,
                                  Integer amount) {
        this.method = method;
        this.originalAmount = originalAmount;
        this.ticketFee = ticketFee;
        this.usedPoint = usedPoint == null ? 0 : usedPoint;
        this.amount = amount;
    }
}