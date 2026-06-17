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
            "JOIN FETCH c.venue " +
            "LEFT JOIN FETCH c.sessions " +
            "WHERE c.id = :id")
    Optional<Concert> findByIdWithDetails(@Param("id") Integer id);

    // 3.  공연 목록 조회 시 회차 정보까지 한 번에 가져오기
    @Query("SELECT DISTINCT c FROM Concert c LEFT JOIN FETCH c.sessions LEFT JOIN FETCH c.venue")
    List<Concert> findAllWithSessionsAndVenue();

    // 3-1. [관리자 목록용] 상태 필터가 적용된 공연 목록 (회차/공연장 함께 조회)
    @Query("SELECT DISTINCT c FROM Concert c LEFT JOIN FETCH c.sessions LEFT JOIN FETCH c.venue WHERE c.concertStatus = :status")
    List<Concert> findAllWithSessionsAndVenueByStatus(@Param("status") ConcertStatus status);

    // 4. 공연 상세 + 공연장 정보만 조회
    @Query("SELECT c FROM Concert c JOIN FETCH c.venue WHERE c.id = :id")
    Optional<Concert> findByIdWithVenue(@Param("id") Integer id);

    // 5. 검색 기능 (제목 또는 아티스트명)
    List<Concert> findByTitleContainingOrArtistContaining(String title, String artist);

    // AI 툴용 - venue fetch join 포함 키워드 검색
    @Query("SELECT c FROM Concert c JOIN FETCH c.venue WHERE c.title LIKE %:keyword% OR c.artist LIKE %:keyword%")
    List<Concert> findByKeywordWithVenue(@Param("keyword") String keyword);

    // 6. 예매 가능(OPEN) 공연만 단순 조회
    @Query("SELECT c FROM Concert c WHERE c.concertStatus = 'OPEN' ORDER BY c.createdAt DESC")
    List<Concert> findAllByStatusOpen();

    // 7. 특정 공연장에 등록된 공연이 존재하는지 확인
    @Query("SELECT COUNT(c) > 0 FROM Concert c WHERE c.venue.id = :venueId")
    boolean existsByVenueId(Integer venueId);

    // 8. 대시보드 - 공연 상태별 개수 (예: 오픈 예정 공연 수)
    long countByConcertStatus(ConcertStatus concertStatus);
}