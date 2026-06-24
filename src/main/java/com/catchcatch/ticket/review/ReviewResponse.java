package com.catchcatch.ticket.review;

import java.util.List;

public class ReviewResponse {

    // 1. 리뷰 목록 전체를 감싸는 래퍼 DTO
    public record ReviewListDTO(
            Double averageRating,
            Long totalReviewCount,
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
            String createdAt
    ) {}
}
