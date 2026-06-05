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
//    @Query("SELECT p FROM Payment p WHERE p.user.id = :userId ORDER BY p.createdAt DESC")
//    List<Payment> findByUserId(@Param("userId") Integer userId);

    /**
     * 내 결제 내역 목록
     */
    @Query("""
        select p
        from Payment p
        join fetch p.booking b
        join fetch b.concertSession cs
        join fetch cs.concert c
        join fetch p.user u
        where u.id = :userId
        order by p.createdAt desc
        """)
    List<Payment> findListByUserId(@Param("userId") Integer userId);


    /**
     * 예매 번호로 결제 내역 조회
     */
    @Query("SELECT p FROM Payment p WHERE p.booking.bookingNumber = :bookingNumber")
    Optional<Payment> findByBookingNumber(@Param("bookingNumber") String bookingNumber);


    /**
     * 결제 상세 내역
     */
    @Query("""
        select p
        from Payment p
        join fetch p.user u
        join fetch p.booking b
        join fetch b.concertSession cs
        join fetch cs.concert c
        join fetch b.seat s
        where p.id = :paymentId
          and u.id = :userId
        """)
    Optional<Payment> findDetailByIdAndUserId(
            @Param("paymentId") Integer paymentId,
            @Param("userId") Integer userId
    );


    /**
     * 중복 결제 방지
     */
    @Query("SELECT COUNT(p) > 0 FROM Payment p WHERE p.paymentId = :paymentId")
    boolean existsByPaymentId(@Param("paymentId") String paymentId);

    @Query("SELECT p FROM Payment p WHERE p.paymentId = :paymentId")
    Optional<Payment> findByPaymentId(@Param("paymentId") String paymentId);

    @Query("""
        SELECT p
        FROM Payment p
        WHERE p.paymentId = :paymentId
          AND p.user.id = :userId
        """)
    Optional<Payment> findByPaymentIdAndUserId(
            @Param("paymentId") String paymentId,
            @Param("userId") Integer userId
    );

    /**
     * 중복 결제 방지
     * 특정 예매 건에 대한 결제 데이터가 이미 존재하는지 확인
     */
    @Query("""
            SELECT CASE WHEN COUNT(p) > 0 THEN true ELSE false END
            FROM Payment p
            WHERE p.booking.id = :bookingId
            """)
    boolean existsByBookingId(@Param("bookingId") Integer bookingId);

}