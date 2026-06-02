package com.catchcatch.ticket.payment;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    /**
     * 내 결제 내역 목록
     */
    @Query("SELECT p FROM Payment p WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
    List<Payment> findByUserId(@Param("userId") Integer userId);



    /**
     * 예매 번호로 결제 내역 조회
     */
    @Query("SELECT p FROM Payment p WHERE p.booking.bookingNumber = :bookingNumber")
    Optional<Payment> findByBookingNumber(@Param("bookingNumber") String bookingNumber);



    /**
     * 결제 상세 내역
     */
    @Query("SELECT p FROM Payment p WHERE p.id = :paymentId AND p.user.id = :userId")
    Optional<Payment> findByIdAndUserId(@Param("paymentId") Integer paymentId,
                                        @Param("userId") Integer userId);



    /**
     * 중복 결제 방지
     * 예매 번호(bookingNumber) 중복 확인 조회
     */
    @Query("SELECT COUNT(p) > 0 FROM Payment p WHERE p.booking.bookingNumber = :bookingNumber")
    boolean existsByBookingNumber(@Param("bookingNumber") String bookingNumber);

}