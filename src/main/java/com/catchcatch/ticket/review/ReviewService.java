package com.catchcatch.ticket.review;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.session.ConcertSession;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final BookingRepository bookingRepository;
    private final ReviewRepository reviewRepository;

    @Transactional
    public void saveReview(Integer userId, Integer concertId, ReviewRequest.SaveDTO dto) {
        List<Booking> endedBookings = bookingRepository.findReviewableBookings(
                        userId,
                        concertId,
                        Status.PAID,
                        LocalDate.now()
                )
                .stream()
                .filter(this::isConcertEnded)
                .toList();

        if (endedBookings.isEmpty()) {
            throw new BadRequestException("공연 관람 완료 후에만 후기를 작성할 수 있습니다.");
        }

        Booking booking = endedBookings.stream()
                .filter(candidate -> !reviewRepository.existsByBookingId(candidate.getId()))
                .findFirst()
                .orElseThrow(() -> new BadRequestException("이미 작성 가능한 예매 건의 후기가 등록되어 있습니다."));

        Review review = Review.builder()
                .user(booking.getUser())
                .concert(booking.getConcertSession().getConcert())
                .booking(booking)
                .rating(dto.rating())
                .content(dto.content())
                .build();

        reviewRepository.save(review);
    }

    @Transactional
    public void updateReview(Integer userId, Integer concertId, Long reviewId, ReviewRequest.UpdateDTO dto) {
        Review review = reviewRepository.findByIdAndUser_IdAndConcert_Id(reviewId, userId, concertId)
                .orElseThrow(() -> new BadRequestException("수정할 수 있는 후기가 없습니다."));

        review.updateReview(dto.rating(), dto.content());
    }

    @Transactional
    public void deleteReview(Integer userId, Integer concertId, Long reviewId) {
        Review review = reviewRepository.findByIdAndUser_IdAndConcert_Id(reviewId, userId, concertId)
                .orElseThrow(() -> new BadRequestException("삭제할 수 있는 후기가 없습니다."));

        reviewRepository.delete(review);
    }

    @Transactional(readOnly = true)
    public ReviewResponse.ReviewListDTO getConcertReviews(Integer concertId, Integer loginUserId, int page) {
        PageRequest pageRequest = PageRequest.of(page, 5);
        Page<Review> reviewPage = reviewRepository.findAllByConcertId(concertId, pageRequest);

        Double avgRating = reviewRepository.findAverageRatingByConcertId(concertId)
                .orElse(0.0);

        List<ReviewResponse.ReviewDetailDTO> reviewDTOs = reviewPage.getContent().stream()
                .map(r -> new ReviewResponse.ReviewDetailDTO(
                        r.getId(),
                        maskUsername(r.getUser().getUsername()),
                        r.getRating(),
                        r.getContent(),
                        r.getCreatedAt().toString(),
                        loginUserId != null && r.getUser().getId().equals(loginUserId)
                ))
                .toList();

        return new ReviewResponse.ReviewListDTO(avgRating, reviewPage.getTotalElements(), reviewDTOs);
    }

    private boolean isConcertEnded(Booking booking) {
        ConcertSession session = booking.getConcertSession();

        LocalDateTime startAt = LocalDateTime.of(
                session.getSessionDate(),
                session.getSessionTime()
        );

        int runtimeMinutes = parseRuntimeMinutes(session.getConcert().getRuntime());
        LocalDateTime endAt = startAt.plusMinutes(runtimeMinutes);

        return LocalDateTime.now().isAfter(endAt);
    }

    private int parseRuntimeMinutes(String runtime) {
        if (runtime == null || runtime.isBlank()) {
            return 0;
        }

        Matcher matcher = Pattern.compile("\\d+").matcher(runtime);
        return matcher.find() ? Integer.parseInt(matcher.group()) : 0;
    }

    private String maskUsername(String username) {
        if (username == null || username.isBlank()) {
            return "익명";
        }

        if (username.length() <= 1) {
            return username + "*";
        }

        if (username.length() == 2) {
            return username.charAt(0) + "*";
        }

        return username.charAt(0)
                + "*".repeat(username.length() - 2)
                + username.charAt(username.length() - 1);
    }
}
