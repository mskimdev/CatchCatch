package com.catchcatch.ticket.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    Optional<Booking> findByBookingNumber(String bookingNumber);

    List<Booking> findByUserId(Integer userId);

    List<Booking> findByStatusAndExpiresAtBefore(String status, Timestamp now);

    List<Booking> findByConcertSessionIdAndStatusIn(
            Integer concertSessionId,
            List<String> statuses
    );

    boolean existsByConcertSessionIdAndSeatIdAndStatusIn(
            Integer concertSessionId,
            Integer seatId,
            List<String> statuses
    );
}