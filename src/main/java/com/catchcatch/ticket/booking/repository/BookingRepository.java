package com.catchcatch.ticket.booking.repository;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.enums.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    long countByStatusAndPaidAtBetween(Status status, Timestamp from, Timestamp to);

    @Query("""
            select sum(b.totalAmount)
            from Booking b
            where b.status = :status
              and b.paidAt between :from and :to
            """)
    Long sumTotalAmountByStatusAndPaidAtBetween(
            @Param("status") Status status,
            @Param("from") Timestamp from,
            @Param("to") Timestamp to
    );

    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch c.venue v
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where u.id = :userId
            order by b.createdAt desc
            """)
    List<Booking> findAllWithDetailsByUserId(@Param("userId") Integer userId);

    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            order by b.createdAt desc
            """)
    List<Booking> findAllWithDetails();

    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch c.venue v
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where u.id = :userId
              and b.status = :status
            order by b.createdAt desc
            """)
    List<Booking> findAllWithDetailsByUserIdAndStatus(
            @Param("userId") Integer userId,
            @Param("status") Status status
    );

    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch c.venue v
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where b.id = :bookingId
              and u.id = :userId
            """)
    Optional<Booking> findByIdAndUserIdWithPaymentInfo(
            @Param("bookingId") Integer bookingId,
            @Param("userId") Integer userId
    );

    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch c.venue v
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where b.id = :bookingId
              and u.id = :userId
            """)
    Optional<Booking> findDetailByIdAndUserId(
            @Param("bookingId") Integer bookingId,
            @Param("userId") Integer userId
    );

    @Query("""
            select distinct b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            left join fetch c.venue v
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where b.id = :bookingId
            """)
    Optional<Booking> findDetailById(@Param("bookingId") Integer bookingId);

    @Query("""
            select distinct b
            from Booking b
            left join fetch b.bookingSeats bs
            left join fetch bs.seat s
            where b.status = :status
              and b.expiresAt < :now
            """)
    List<Booking> findExpiredBookings(
            @Param("status") Status status,
            @Param("now") Timestamp now
    );
}
