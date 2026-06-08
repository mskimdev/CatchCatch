package com.catchcatch.ticket.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    Optional<Booking> findByBookingNumber(String bookingNumber);

    List<Booking> findByUserId(Integer userId);

    List<Booking> findByStatusAndExpiresAtBefore(String status, Timestamp now);

    List<Booking> findByConcertSession_IdAndStatusIn(
            Integer concertSessionId,
            List<String> statuses
    );

    boolean existsByConcertSession_IdAndSeat_IdAndStatusIn(
            Integer concertSessionId,
            Integer seatId,
            List<String> statuses
    );

    @Query("""
            select b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            join fetch c.venue v
            join fetch b.seat s
            where u.id = :userId
            order by b.createdAt desc
            """)
    List<Booking> findAllWithDetailsByUserId(@Param("userId") Integer userId);

    @Query("""
            select b
            from Booking b
            join fetch b.user u
            join fetch b.concertSession cs
            join fetch cs.concert c
            join fetch c.venue v
            join fetch b.seat s
            where u.id = :userId
              and b.status = :status
            order by b.createdAt desc
            """)
    List<Booking> findAllWithDetailsByUserIdAndStatus(
            @Param("userId") Integer userId,
            @Param("status") String status
    );
}