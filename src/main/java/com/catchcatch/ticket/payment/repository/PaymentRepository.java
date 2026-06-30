package com.catchcatch.ticket.payment.repository;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.payment.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PaymentRepository extends JpaRepository<Payment, Integer> {

    @Query("""
            SELECT p FROM Payment p
            JOIN FETCH p.booking b
            JOIN FETCH b.concertSession cs
            JOIN FETCH cs.concert c
            WHERE b.user.id = :userId
            AND (:status IS NULL OR p.status = :status)
            AND (:keyword IS NULL
                 OR b.bookingNumber LIKE CONCAT('%', :keyword, '%')
                 OR c.title LIKE CONCAT('%', :keyword, '%'))
            ORDER BY p.createdAt DESC
            """)
    List<Payment> searchMyPayments(@Param("userId") Integer userId,
                                   @Param("keyword") String keyword,
                                   @Param("status") PaymentStatus status);


    @Query("""
        select p
        from Payment p
        where p.booking.id = :bookingId
        """)
    Optional<Payment> findByBookingId(@Param("bookingId") Integer bookingId);


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


    @Query("""
            select case when count(p) > 0 then true else false end
            from Payment p
            where p.paymentId = :paymentId
            """)
    boolean existsByPaymentId(@Param("paymentId") String paymentId);


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


    Optional<Payment> findByBookingAndStatus(Booking booking, PaymentStatus status);

}