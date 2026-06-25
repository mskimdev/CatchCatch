package com.catchcatch.ticket.review;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ReviewRepository extends JpaRepository<Review,Long> {

    // 1. 특정 콘서트의 리뷰 목록 조회
    Page<Review> findAllByConcertId(Integer concertId, Pageable pageable);

    // 2. 해당 예매 건으로 이미 리뷰를 썼는지 체크
    boolean existsByBookingId(Integer bookingId);

    // 3. 평균 평점 조회
    @Query("SELECT AVG(r.rating) FROM Review r " +
            "WHERE r.concert.id = :concertId")
    Optional<Double> findAverageRatingByConcertId(@Param("concertId") Integer concertId);

    // 권한 확인
    long countByConcertId(Integer concertId);

    Optional<Review> findByIdAndUser_IdAndConcert_Id(
            Long reviewId,
            Integer userId,
            Integer concertId
    );

    @Query("""
            select r
            from Review r
            join fetch r.user u
            join fetch r.concert c
            join fetch r.booking b
            where (:concertId is null or c.id = :concertId)
            order by r.createdAt desc
            """)
    List<Review> findAllForAdmin(@Param("concertId") Integer concertId);

}
