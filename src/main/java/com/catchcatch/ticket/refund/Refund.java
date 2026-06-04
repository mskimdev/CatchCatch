package com.catchcatch.ticket.refund;

import com.catchcatch.ticket.payment.Payment;
import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDateTime;

@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@Table(
        name = "refund_tb",
        uniqueConstraints = {
                @UniqueConstraint(name = "uk_refund_payment", columnNames = "payment_id")
        }
)
@Entity
public class Refund {

    // 환불 고유 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // 결제 ID payment_tb.id 참조
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    // 실제 환불 금액 원
    @Column(nullable = false)
    private Integer amount;

    // 취소 수수료 원
    @ColumnDefault("0")
    @Column(nullable = false)
    private Integer cancelFee;

    // 환불 사유
    @Column(length = 255)
    private String reason;

    // 환불 처리 일시
    @CreationTimestamp
    @Column(name = "refunded_at", nullable = false, updatable = false)
    private LocalDateTime refundedAt;

    @Builder
    public Refund(Payment payment, Integer amount, Integer cancelFee, String reason) {
        this.payment = payment;
        this.amount = amount;
        this.cancelFee = cancelFee == null ? 0 : cancelFee;
        this.reason = reason;
    }
}