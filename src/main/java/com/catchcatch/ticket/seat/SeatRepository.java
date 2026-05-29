package com.catchcatch.ticket.seat;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Integer> {

    List<Seat> findByConcertSession_IdOrderBySeatNumberAsc(Integer sessionId);

    long countByConcertSession_Id(Integer sessionId);

    long countByConcertSession_IdAndStatus(Integer sessionId, SeatStatus status);

    boolean existsByConcertSession_IdAndStatus(Integer sessionId, SeatStatus status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select s
            from Seat s
            where s.concertSession.id = :sessionId
              and s.id in :seatIds
            """)
    List<Seat> findAllByIdInAndSessionIdForUpdate(
            @Param("sessionId") Integer sessionId,
            @Param("seatIds") List<Integer> seatIds
    );
}