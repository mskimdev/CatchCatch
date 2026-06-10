package com.catchcatch.ticket.booking.bookingSeat;

import com.catchcatch.ticket.booking.Status;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface BookingSeatRepository extends JpaRepository<BookingSeat, Integer> {

    // 특정 예매에 포함된 좌석 목록 조회
    List<BookingSeat> findByBooking_Id(Integer bookingId);

    // 특정 사용자의 모든 예매 좌석 조회
    List<BookingSeat> findByBooking_User_Id(Integer userId);

    // 특정 좌석이 어떤 예매 상세에 포함되었는지 조회
    List<BookingSeat> findBySeat_Id(Integer seatId);

    @Query("""
        select bs.seat.id
        from BookingSeat bs
        join bs.booking b
        join bs.seat s
        where b.concertSession.id = :sessionId
          and b.status in :statuses
        """)
    List<Integer> findSeatIdsBySessionIdAndBookingStatusIn(
            @Param("sessionId") Integer sessionId,
            @Param("statuses") List<Status> statuses
    );
}