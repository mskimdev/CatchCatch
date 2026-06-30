package com.catchcatch.ticket.refund.repository;

import com.catchcatch.ticket.refund.Refund;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface RefundRepository extends JpaRepository<Refund, Integer> {

    /**
     * 결제 ID로 환불 내역 조회
     */
    Optional<Refund> findByPayment_PaymentId(String paymentId);

    /**
     * 결제 ID 기준 환불 존재 여부 확인
     */
    boolean existsByPayment_PaymentId(String paymentId);

    /**
     * 예매 ID로 환불 내역 조회
     * Refund -> Payment -> Booking 경로로 조회
     */
    Optional<Refund> findByPayment_Booking_Id(Integer bookingId);

    /**
     * 예매 ID 기준 환불 존재 여부 확인
     */
    boolean existsByPayment_Booking_Id(Integer bookingId);
}