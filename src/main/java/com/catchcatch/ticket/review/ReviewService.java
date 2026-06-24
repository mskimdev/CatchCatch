package com.catchcatch.ticket.review;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final BookingRepository bookingRepository;
    private final ConcertRepository concertRepository;
    private final ReviewRepository reviewRepository;


    // 1. 리뷰 작성
    @Transactional
    public void saveReview(Integer userId, Integer concertId, ReviewRequest.SaveDTO dto) {

        Booking booking = bookingRepository.findById(dto.bookingId())
                .orElseThrow(() -> new BadRequestException("예매 내역을 찾을 수 없습니다."));

        if (!booking.getUser().getId().equals(userId)) {
            throw new BadRequestException("본인의 예매 내역이 아닙니다.");
        }

        // [검증 2] 해당 콘서트에 이미 리뷰를 썼는지 확인 (1예매 1리뷰)
        if (reviewRepository.existsByBookingId(dto.bookingId())) {
            throw new RuntimeException("이미 작성된 리뷰가 있습니다.");
        }

        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new BadRequestException("존재하지 않는 공연입니다."));


        Review review = Review.builder()
                .user(booking.getUser())
                .concert(concert)
                .booking(booking)
                .rating(dto.rating())
                .content(dto.content())
                .build();

        reviewRepository.save(review);
    }

    // 2. 리뷰 목록 조회
    @Transactional(readOnly = true)
    public ReviewResponse.ReviewListDTO getConcertReviews(Integer concertId, int page) {
        PageRequest pageRequest = PageRequest.of(page, 5);
        Page<Review> reviewPage = reviewRepository.findAllByConcertId(concertId, pageRequest);

        Double avgRating = reviewRepository.findAverageRatingByConcertId(concertId.intValue())
                .orElse(0.0);

        List<ReviewResponse.ReviewDetailDTO> reviewDTOs = reviewPage.getContent().stream()
                .map(r -> new ReviewResponse.ReviewDetailDTO(
                        r.getId(),
                        maskUsername(r.getUser().getUsername()),
                        r.getRating(),
                        r.getContent(),
                        r.getCreatedAt().toString()
                ))
                .collect(Collectors.toList());

        return new ReviewResponse.ReviewListDTO(avgRating, reviewPage.getTotalElements(), reviewDTOs);
    }

    // 닉네임 마스킹
    private String maskUsername(String username) {
        if (username.length() <= 2) return username.charAt(0) + "*";
        return username.charAt(0) + "*".repeat(username.length() - 2) + username.charAt(username.length() - 1);
    }
}
