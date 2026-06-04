package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.*;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;
import org.hibernate.annotations.CreationTimestamp;

import java.sql.Timestamp;

@Data
@NoArgsConstructor
@Table(name = "payment_tb")
@Entity
public class Payment {


//    컬럼명	타입	키	NOT NULL	기본값	설명
//    id	INT (PK, AI)	PK	Y	AUTO_INCREMENT	결제 고유 ID
//    booking_id	INT	FK(booking)	Y		예매 ID (booking_tb.id 참조)
//    user_id	INT	FK(user)	Y		사용자 ID (user_tb.id 참조)
//    imp_uid	VARCHAR(100)		Y		포트원 결제 고유 번호
//    merchant_uid	VARCHAR(100)		Y		가맹점 주문 번호 (UNIQUE)
//    amount	INT		Y		결제 금액 (원)
//    method	VARCHAR(30)		Y		결제 수단 (card / kakaopay / tosspay)
//    status	VARCHAR(20)		Y	READY	READY / PAID / CANCELLED
//    paid_at	TIMESTAMP		N	NULL	결제 완료 일시
//    created_at	TIMESTAMP		Y	CURRENT_TIMESTAMP	결제 요청 일시


    // 결제 고유 ID
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(nullable = false)
    private Integer id;

    // 예매 ID (booking_tb.id 참조)
    @OneToOne(fetch = FetchType.LAZY) // CatchCatch 명세서상 1:1 관계 (성능을 위해 LAZY 권장)
    @JoinColumn(name = "booking_id", nullable = false) // FK 컬럼명 지정 및 NOT NULL 설정
    private Booking booking; // Integer 대신 연관된 Booking 엔티티 객체를 직접 참조

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    // 포트원 결제 고유 번호
    private String pgTxId;

    // 가맹점 주문 번호 (UNIQUE)
    @Column(name = "payment_id", nullable = false,unique = true)
    private String paymentId;

    // 결제 금액 (원)
    @Column(nullable = false)
    private Integer amount;

    // 결제 수단 (card / kakaopay / tosspay)
    @Column(nullable = false)
    private String method;

    @Enumerated(EnumType.STRING)
    @ColumnDefault("'READY'")
    @Column(nullable = false)
    private PaymentStatus status;

    // 결제 완료 일시
    @Column(nullable = true)
    private Timestamp paidAt;

    // 결제 요청 일시
    @CreationTimestamp
    @Column(nullable = false)
    private Timestamp createdAt;

    @Builder
    public Payment(Integer id, Booking booking, User user, String pgTxId, String paymentId, Integer amount, String method, PaymentStatus status, Timestamp paidAt, Timestamp createdAt) {
        this.id = id;
        this.booking = booking;
        this.user = user;
        this.paymentId = paymentId;
        this.pgTxId = pgTxId;
        this.amount = amount;
        this.method = method;
        this.status = status;
        this.paidAt = paidAt;
        this.createdAt = createdAt;
    }
}
