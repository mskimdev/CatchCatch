package com.catchcatch.ticket.refund;


import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.payment.Payment;
import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CurrentTimestamp;

import java.sql.Timestamp;

@Data
@NoArgsConstructor
@Table(name = "refund_tb")
@Entity
public class Refund {

    /*
    컬럼명	타입	키	NOT NULL	기본값	설명
    id	INT (PK, AI)	PK	Y	AUTO_INCREMENT	환불 고유 ID
    payment_id	INT	FK(payment)	Y		결제 ID (payment_tb.id 참조)
    booking_id	INT	FK(booking)	Y		예매 ID (booking_tb.id 참조)
    amount	INT		Y		환불 금액 (원)
    fee	INT		Y	0	취소 수수료 (원)
    reason	VARCHAR(255)		N	NULL	환불 사유
    refunded_at	TIMESTAMP		Y	CURRENT_TIMESTAMP	환불 처리 일시
     */

    // 환불 고유 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Integer id;

    // 결제 ID (payment_tb.id 참조)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    // 	예매 ID (booking_tb.id 참조)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id",nullable = false)
    private Booking booking;

    // 환불 금액 (원)
    @Column(nullable = false)
    private Integer amount;

    // 취소 수수료 (원)
    @ColumnDefault("0")
    @Column(nullable = false)
    private Integer fee;

    // 환불 사유
    private String reason;

    // 환불 처리 일시
    @CurrentTimestamp
    @Column(nullable = false)
    private Timestamp refundedAt;

}
