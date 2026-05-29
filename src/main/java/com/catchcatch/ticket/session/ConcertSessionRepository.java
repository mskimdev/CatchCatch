package com.catchcatch.ticket.session;

import com.catchcatch.ticket.concert.Concert;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface ConcertSessionRepository extends JpaRepository<ConcertSession, Integer> {

    /**
     * 특정 콘서트의 관람일 목록 조회
     * 달력 활성화용
     */
    @Query("""
            select distinct cs.sessionDate
            from ConcertSession cs
            where cs.concertId = :concertId
            order by cs.sessionDate asc
            """)
    List<LocalDate> findDistinctSessionDatesByConcertId(
            @Param("concertId") Integer concertId
    );

    /**
     * 특정 날짜의 회차 조회
     * 예: 2026-05-20 클릭 시 10:00, 16:00 조회
     */
    List<ConcertSession> findByConcertIdAndSessionDateOrderBySessionTimeAsc(
            Integer concertId,
            LocalDate sessionDate
    );

    /**
     * 예매하기 전에 해당 회차가 해당 콘서트의 회차인지 검증
     */
    Optional<ConcertSession> findByIdAndConcertId(
            Integer sessionId,
            Integer concertId
    );
}
