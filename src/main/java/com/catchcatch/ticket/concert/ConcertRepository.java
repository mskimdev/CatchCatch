package com.catchcatch.ticket.concert;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConcertRepository extends JpaRepository<Concert,Integer> {


    // 1. 공연 목록 조회 (최신순)
    @Query("SELECT DISTINCT c FROM Concert c " +
            "JOIN FETCH c.venue " +
            "JOIN FETCH c.sessions " +
            "WHERE c.status = :status " +
            "ORDER BY c.createdAt DESC")
    List<Concert> findAllByStatusWithFetchJoin(@Param("status") Status status);

    // 2. 공연 상세 + 회차 정보 (Fetch Join)
    @Query("SELECT DISTINCT c FROM Concert c JOIN FETCH c.sessions WHERE c.id = :concertId")
    Optional<Concert> findByIdWithSessions(@Param("concertId") Integer concertId);

    // 3. 공연 상세 + 공연장 정보 (Fetch Join)
    @Query("SELECT c FROM Concert c JOIN FETCH c.venue WHERE c.id = :id")
    Optional<Concert> findByIdWithVenue(@Param("id") Integer id);

    // 4. 검색 기능 (OR 조건)
    List<Concert> findByTitleContainingOrArtistContaining(String title, String artist);

    // 5. 예매 가능 공연만 조회 (고정 쿼리)
    @Query("SELECT c FROM Concert c WHERE c.status = 'OPEN' ORDER BY c.createdAt DESC")
    List<Concert> findAllByStatusOpen();





//    // 6. [추가 추천] 대규모 트래픽 대비 페이징 처리 버전
//    // 메인 페이지에 수천 개의 공연이 뜰 경우를 대비해 Pageable을 사용하는 것이 좋습니다.
//    Page<Concert> findAllByStatus(String status, Pageable pageable);



}
