package com.catchcatch.ticket.review;

import java.util.List;

public class ReviewResponse {

    // 1. 리뷰 목록 전체를 감싸는 래퍼 DTO
    public record ReviewListDTO(
            Double averageRating,
            Long totalReviewCount,
            boolean reviewEnabled,
            List<ReviewDetailDTO> reviews
    ) {
        // 엔티티 리스트를 DTO로 변환하는 정적 팩토리 메서드 구현 예정
    }

    // 2. 개별 리뷰 상세 DTO
    public record ReviewDetailDTO(
            Long reviewId,
            String maskedUsername,
            Double rating,
            String content,
            String createdAt,
            Boolean mine
    ) {}

    public record AdminPageDTO(
            List<ConcertOptionDTO> concerts,
            List<AdminReviewDTO> reviews,
            Integer selectedConcertId,
            String selectedConcertTitle,
            boolean hasSelectedConcert,
            boolean reviewEnabled,
            int reviewCount,
            String averageRating
    ) {}

    public record ConcertOptionDTO(
            Integer id,
            String title,
            boolean selected
    ) {}

    public record AdminReviewDTO(
            Long reviewId,
            Integer concertId,
            String concertTitle,
            Integer bookingId,
            String bookingNumber,
            Integer userId,
            String username,
            String userEmail,
            Double rating,
            String content,
            String createdAt
    ) {}

}
