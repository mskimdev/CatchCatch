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
    @Query("""
            select distinct p
            from Payment p
            join fetch p.booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where u.id = :userId
            order by p.createdAt desc
            """)
    List<Payment> findListByUserId(@Param("userId") Integer userId);

    /**
     * 예매 ID로 결제 조회
     * Payment 1 : 1 Booking 구조에서
     * 이미 결제 준비된 Payment가 있는지 확인할 때 사용
     */
    @Query("""
        select p
        from Payment p
        where p.booking.id = :bookingId
        """)
    Optional<Payment> findByBookingId(@Param("bookingId") Integer bookingId);


    /**
     * 예매 번호로 결제 내역 조회
     */
    @Query("""
            select distinct p
            from Payment p
            join fetch p.booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where b.bookingNumber = :bookingNumber
            """)
    Optional<Payment> findByBookingNumber(@Param("bookingNumber") String bookingNumber);


    /**
     * 결제 상세 내역
     */
    @Query("""
            select distinct p
            from Payment p
            join fetch p.booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where p.id = :paymentId
              and u.id = :userId
            """)
    Optional<Payment> findDetailByIdAndUserId(
            @Param("paymentId") Integer paymentId,
            @Param("userId") Integer userId
    );


    /**
     * paymentId 중복 방지
     */
    @Query("""
            select case when count(p) > 0 then true else false end
            from Payment p
            where p.paymentId = :paymentId
            """)
    boolean existsByPaymentId(@Param("paymentId") String paymentId);


    /**
     * paymentId 기준 결제 조회
     */
    @Query("""
            select distinct p
            from Payment p
            join fetch p.booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where p.paymentId = :paymentId
            """)
    Optional<Payment> findByPaymentId(@Param("paymentId") String paymentId);


    /**
     * paymentId + userId 기준 결제 조회
     */
    @Query("""
            select distinct p
            from Payment p
            join fetch p.booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where p.paymentId = :paymentId
              and u.id = :userId
            """)
    Optional<Payment> findByPaymentIdAndUserId(
            @Param("paymentId") String paymentId,
            @Param("userId") Integer userId
    );


    /**
     * 특정 예매 건에 결제가 이미 있는지 확인
     */
    @Query("""
            select case when count(p) > 0 then true else false end
            from Payment p
            where p.booking.id = :bookingId
            """)
    boolean existsByBookingId(@Param("bookingId") Integer bookingId);
}