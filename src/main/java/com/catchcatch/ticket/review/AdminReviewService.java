package com.catchcatch.ticket.review;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class AdminReviewService {

    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final ReviewRepository reviewRepository;
    private final ConcertRepository concertRepository;

    @Transactional(readOnly = true)
    public ReviewResponse.AdminPageDTO getReviewPage(Integer concertId) {
        List<Concert> concerts = concertRepository.findAll(Sort.by(Sort.Direction.ASC, "title"));
        boolean selectedConcertExists = concertId != null && concerts.stream()
                .anyMatch(concert -> Objects.equals(concert.getId(), concertId));
        Integer effectiveConcertId = selectedConcertExists ? concertId : null;

        List<ReviewResponse.ConcertOptionDTO> concertOptions = concerts.stream()
                .map(concert -> new ReviewResponse.ConcertOptionDTO(
                        concert.getId(),
                        concert.getTitle(),
                        Objects.equals(concert.getId(), effectiveConcertId)
                ))
                .toList();

        List<ReviewResponse.AdminReviewDTO> reviews = reviewRepository.findAllForAdmin(effectiveConcertId).stream()
                .map(this::toAdminReviewDTO)
                .toList();

        String selectedConcertTitle = concerts.stream()
                .filter(concert -> Objects.equals(concert.getId(), effectiveConcertId))
                .map(Concert::getTitle)
                .findFirst()
                .orElse("전체 콘서트");

        boolean reviewEnabled = concerts.stream()
                .filter(concert -> Objects.equals(concert.getId(), effectiveConcertId))
                .map(Concert::isReviewEnabled)
                .findFirst()
                .orElse(true);

        return new ReviewResponse.AdminPageDTO(
                concertOptions,
                reviews,
                effectiveConcertId,
                selectedConcertTitle,
                selectedConcertExists,
                reviewEnabled,
                reviews.size(),
                formatAverageRating(reviews)
        );
    }

    @Transactional
    public void updateReview(Long reviewId, ReviewRequest.UpdateDTO dto) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new BadRequestException("수정할 후기를 찾을 수 없습니다."));

        review.updateReview(dto.rating(), dto.content());
    }

    @Transactional
    public void updateReviewEnabled(Integer concertId, ReviewRequest.AdminReviewStatusDTO dto) {
        Concert concert = concertRepository.findById(concertId)
                .orElseThrow(() -> new BadRequestException("콘서트를 찾을 수 없습니다."));

        concert.setReviewEnabled(Boolean.TRUE.equals(dto.reviewEnabled()));
    }

    private ReviewResponse.AdminReviewDTO toAdminReviewDTO(Review review) {
        Booking booking = review.getBooking();

        return new ReviewResponse.AdminReviewDTO(
                review.getId(),
                review.getConcert().getId(),
                review.getConcert().getTitle(),
                booking.getId(),
                booking.getBookingNumber(),
                review.getUser().getId(),
                nullToBlank(review.getUser().getUsername()),
                nullToBlank(review.getUser().getEmail()),
                review.getRating(),
                nullToBlank(review.getContent()),
                formatTimestamp(review.getCreatedAt())
        );
    }

    private String formatAverageRating(List<ReviewResponse.AdminReviewDTO> reviews) {
        if (reviews.isEmpty()) {
            return "0.0";
        }

        double average = reviews.stream()
                .map(ReviewResponse.AdminReviewDTO::rating)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        return String.format(Locale.US, "%.1f", average);
    }

    private String formatTimestamp(Timestamp timestamp) {
        if (timestamp == null) {
            return "";
        }

        return timestamp.toLocalDateTime().format(DATE_TIME_FORMATTER);
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }
}
