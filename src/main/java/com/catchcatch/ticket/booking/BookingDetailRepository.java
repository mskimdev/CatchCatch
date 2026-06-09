package com.catchcatch.ticket.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface BookingDetailRepository extends JpaRepository<BookingDetail, Integer> {

    Optional<BookingDetail> findByBookingDetailNumber(String bookingDetailNumber);

    List<BookingDetail> findByUserId(Integer userId);
}
