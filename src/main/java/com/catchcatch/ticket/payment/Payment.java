package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;
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

    // 결제 고유 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 예매 ID
    // Payment 1 : 1 Booking
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    // 포트원 V2 paymentId
    // 우리 서버에서 생성하는 결제 고유 번호
    @Column(name = "payment_id", nullable = false, length = 100)
    private String paymentId;

    // PG 거래 번호
    // 결제 완료 후 포트원 조회 응답에서 저장
    @Column(name = "pg_tx_id", length = 100)
    private String pgTxId;

    // 오리지널 가격 (originalAmount)
    @Column(name = "original_amount", nullable = false)
    private Integer originalAmount;

    // 티켓 수수료
    @Column(name = "ticket_fee", nullable = false)
    private Integer ticketFee;

    // 사용한 포인트 (usedPoint)
    @Column(name = "used_point", nullable = false)
    private Integer usedPoint;

    // 최종 결제 금액
    @Column(nullable = false)
    private Integer amount;

    // 결제 수단
    // card / kakaopay / tosspay / vbank 등
    @Column(nullable = false, length = 30)
    private String method;

    // 결제 상태
    // READY / PAID / CANCELLED
    @Enumerated(EnumType.STRING)
    @ColumnDefault("'READY'")
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.READY;

    // 결제 완료 일시
    @Column(name = "paid_at")
    private Timestamp paidAt;

    // 결제 요청 일시
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

    /**
     * 결제 완료 처리
     */
    public void complete(String pgTxId) {
        if (this.status != PaymentStatus.READY) {
            throw new IllegalStateException("결제 대기 상태가 아닙니다.");
        }

        this.pgTxId = pgTxId;
        this.status = PaymentStatus.PAID;
        this.paidAt = new Timestamp(System.currentTimeMillis());
    }

    /**
     * 결제 취소 처리
     */
    public void cancel() {
        if (this.status == PaymentStatus.CANCELLED) {
            throw new IllegalStateException("이미 취소된 결제입니다.");
        }

        this.status = PaymentStatus.CANCELLED;
    }

    /**
     * 화면/DTO에서 userId가 필요할 때 사용
     */
    public Integer getUserId() {
        return this.booking.getUser().getId();
    }

    // 결제 수단 변경
    public void changeMethod(String method) {
        if (this.status != PaymentStatus.READY) {
            throw new IllegalStateException("결제 대기 상태에서만 결제 수단을 변경할 수 있습니다.");
        }

        this.method = method;
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