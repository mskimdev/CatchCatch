package com.catchcatch.ticket.concert.repository;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.core.ConcertStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConcertRepository extends JpaRepository<Concert, Integer>, ConcertRepositoryCustom {

    // 1. [홈페이지/목록용] 예매 상태별 공연 목록 조회 (공연장, 회차 동시 페치)
    @Query("SELECT DISTINCT c FROM Concert c " +
            "JOIN FETCH c.venue " +
            "JOIN FETCH c.sessions " +
            "WHERE c.concertStatus = :status " +
            "ORDER BY c.createdAt DESC")
    List<Concert> findAllByStatusWithFetchJoin(@Param("status") ConcertStatus concertStatus);

    // 2. [상세 페이지용] 공연 정보 + 공연장(Venue) + 회차(Sessions) 모두 한 번에 조회
    @Query("SELECT DISTINCT c FROM Concert c " +
            "LEFT JOIN FETCH c.venue " +
            "LEFT JOIN FETCH c.sessions " +
            "WHERE c.id = :id")
    Optional<Concert> findByIdWithDetails(@Param("id") Integer id);

    // 3. 💡 [빠른 예매용] 공연 상세 + 회차 정보만 조회 (N+1 방지)
    @Query("SELECT DISTINCT c FROM Concert c JOIN FETCH c.sessions WHERE c.id = :concertId")
    Optional<Concert> findByIdWithSessions(@Param("concertId") Integer concertId);

    // 4. 공연 상세 + 공연장 정보만 조회
    @Query("SELECT c FROM Concert c JOIN FETCH c.venue WHERE c.id = :id")
    Optional<Concert> findByIdWithVenue(@Param("id") Integer id);

    // 5. 검색 기능 (제목 또는 아티스트명)
    List<Concert> findByTitleContainingOrArtistContaining(String title, String artist);

    // 6. 예매 가능(OPEN) 공연만 단순 조회
    @Query("SELECT c FROM Concert c WHERE c.concertStatus = 'OPEN' ORDER BY c.createdAt DESC")
    List<Concert> findAllByStatusOpen();
}