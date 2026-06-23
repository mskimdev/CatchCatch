package com.catchcatch.ticket.seat;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
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
     * 대시보드 - 공연별 판매율(SOLD / 전체) 집계
     *
     * 공연 1개에 회차가 여러 개여도 전체 좌석을 합산해 비율을 계산한다.
     */
    @Query("""
            select cs.concert.id as concertId,
                   cs.concert.title as title,
                   count(s) as totalCount,
                   sum(case when s.status = 'SOLD' then 1 else 0 end) as soldCount
            from Seat s
            join s.concertSession cs
            group by cs.concert.id, cs.concert.title
            """)
    List<ConcertSalesRate> findConcertSalesRates();

    interface ConcertSalesRate {
        Integer getConcertId();
        String getTitle();
        long getTotalCount();
        long getSoldCount();
    }

    /**
     * 대시보드 - 공연별 등급별 판매율(SOLD / 전체) 집계
     */
    @Query("""
            select cs.concert.id as concertId,
                   s.grade as grade,
                   count(s) as totalCount,
                   sum(case when s.status = 'SOLD' then 1 else 0 end) as soldCount
            from Seat s
            join s.concertSession cs
            where cs.concert.id = :concertId
            group by cs.concert.id, s.grade
            """)
    List<GradeSalesRate> findGradeSalesRatesByConcertId(@Param("concertId") Integer concertId);

    interface GradeSalesRate {
        Integer getConcertId();
        SeatGrade getGrade();
        long getTotalCount();
        long getSoldCount();
    }

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

    /**
     * 특정 회차의 모든 좌석 대량 삭제 (Bulk Delete)
     */
    @Modifying
    @Query("DELETE FROM Seat s WHERE s.concertSession.id = :sessionId")
    void deleteBySessionId(@Param("sessionId") Integer sessionId);
}