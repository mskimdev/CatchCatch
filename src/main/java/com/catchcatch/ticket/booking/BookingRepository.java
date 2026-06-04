package com.catchcatch.ticket.booking;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    // 마이페이지 예매 내역 전체 조회
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.concertSession cs
            JOIN FETCH cs.concert c
            JOIN FETCH c.venue
            JOIN FETCH b.seat
            WHERE b.user.id = :userId
            ORDER BY b.createdAt DESC
            """)
    List<Booking> findAllWithDetailsByUserId(@Param("userId") Integer userId);

    // 마이페이지 예매 내역 상태 필터 조회
    @Query("""
            SELECT b FROM Booking b
            JOIN FETCH b.concertSession cs
            JOIN FETCH cs.concert c
            JOIN FETCH c.venue
            JOIN FETCH b.seat
            WHERE b.user.id = :userId
            AND b.status = :status
            ORDER BY b.createdAt DESC
            """)
    List<Booking> findAllWithDetailsByUserIdAndStatus(@Param("userId") Integer userId, @Param("status") String status);
}
