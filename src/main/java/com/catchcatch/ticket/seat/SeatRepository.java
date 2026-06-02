package com.catchcatch.ticket.seat;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface SeatRepository extends JpaRepository<Seat, Integer> {

    /**
     * 좌석 화면에서 특정 회차의 전체 좌석 조회
     */
    List<Seat> findByConcertSession_IdOrderBySeatNumberAsc(Integer sessionId);

    /**
     * 특정 회차의 전체 좌석 수
     */
    long countByConcertSession_Id(Integer sessionId);

    /**
     * 특정 회차의 상태별 좌석 수
     */
    long countByConcertSession_IdAndStatus(Integer sessionId, SeatStatus status);

    /**
     * 특정 회차에 예매 가능한 좌석이 있는지 확인
     */
    boolean existsByConcertSession_IdAndStatus(Integer sessionId, SeatStatus status);

    /**
     * 특정 회차의 특정 등급 전체 좌석 수
     */
    long countByConcertSession_IdAndGrade(Integer sessionId, SeatGrade grade);

    /**
     * 특정 회차의 특정 등급 + 특정 상태 좌석 수
     *
     * 예:
     * VIP 등급 중 AVAILABLE 좌석 수
     * R 등급 중 SOLD 좌석 수
     */
    long countByConcertSession_IdAndGradeAndStatus(
            Integer sessionId,
            SeatGrade grade,
            SeatStatus status
    );

    /**
     * 좌석 임시 점유 시 동시성 방지용 조회
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select s
            from Seat s
            where s.concertSession.id = :sessionId
              and s.id in :seatIds
            order by s.id asc
            """)
    List<Seat> findAllByIdInAndSessionIdForUpdate(
            @Param("sessionId") Integer sessionId,
            @Param("seatIds") List<Integer> seatIds
    );
}