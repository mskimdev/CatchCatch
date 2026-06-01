package com.catchcatch.ticket.booking;

import org.springframework.data.jpa.repository.JpaRepository;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

public interface BookingRepository extends JpaRepository<Booking, Integer> {

    // 예매 번호로 예매 1건 찾기
    Optional<Booking> findByBookingNumber(String bookingNumber);

    // 특정 사용자의 예매 목록 찾기
    List<Booking> findByUserId(Integer userId);

    // 결제 시간이 지난 PENDING 예매 찾기
    List<Booking> findByStatusAndExpiresAtBefore(String status, Timestamp now);
}
