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
    @Column(name = "amount", nullable = false)
    private Integer refundPrice;


    // 취소 수수료 원
    @ColumnDefault("0")
    @Column(name = "fee", nullable = false)
    private Integer cancelFee = 0;

    // 환불 사유
    @Column(name = "reason", length = 255)
    private String refundReason;

    // 환불 처리 일시
    @CreationTimestamp
    @Column(name = "refunded_at", nullable = false, updatable = false)
    private LocalDateTime refundedAt;

    @Builder
    public Refund(Payment payment, Integer refundPrice, Integer cancelFee, String refundReason) {
        this.payment = payment;
        this.refundPrice = refundPrice;
        this.cancelFee = cancelFee == null ? 0 : cancelFee;
        this.refundReason = refundReason;
    }
}