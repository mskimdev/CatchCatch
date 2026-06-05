package com.catchcatch.ticket.concertlike;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ConcertLikeRepository extends JpaRepository<ConcertLike, Integer> {

    Optional<ConcertLike> findByUserIdAndConcertId(Integer userId, Integer concertId);

    void deleteByUserIdAndConcertId(Integer userId, Integer concertId);

    boolean existsByUserIdAndConcertId(Integer userId, Integer concertId);

    // 로그인 유저가 관심 등록한 공연 ID 목록
    @Query("SELECT cl.concert.id FROM ConcertLike cl WHERE cl.user.id = :userId")
    List<Integer> findLikedConcertIdsByUserId(@Param("userId") Integer userId);

    // 관심 공연 목록 조회 (concert + venue JOIN FETCH)
    @Query("""
            SELECT cl FROM ConcertLike cl
            JOIN FETCH cl.concert c
            JOIN FETCH c.venue
            WHERE cl.user.id = :userId
            ORDER BY cl.createdAt DESC
            """)
    List<ConcertLike> findAllWithConcertByUserId(@Param("userId") Integer userId);
}
