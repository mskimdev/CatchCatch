package com.catchcatch.ticket.review;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.session.ConcertSession;
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
    private final BookingRepository bookingRepository;
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

        return new ReviewResponse.AdminPageDTO(
                concertOptions,
                reviews,
                effectiveConcertId,
                selectedConcertTitle,
                selectedConcertExists,
                reviews.size(),
                formatAverageRating(reviews)
        );
    }

    @Transactional(readOnly = true)
    public List<ReviewResponse.AdminBookingOptionDTO> getReviewCandidateBookings(Integer concertId) {
        if (concertId == null) {
            throw new BadRequestException("콘서트를 선택해주세요.");
        }

        return bookingRepository.findAdminReviewCandidateBookings(concertId, Status.PAID).stream()
                .map(this::toBookingOptionDTO)
                .toList();
    }

    @Transactional
    public void createReview(ReviewRequest.AdminSaveDTO dto) {
        Booking booking = bookingRepository.findDetailById(dto.bookingId())
                .orElseThrow(() -> new BadRequestException("후기를 등록할 예매를 찾을 수 없습니다."));

        Concert concert = booking.getConcertSession().getConcert();

        if (!Objects.equals(concert.getId(), dto.concertId())) {
            throw new BadRequestException("선택한 콘서트와 예매 정보가 일치하지 않습니다.");
        }

        if (booking.getStatus() != Status.PAID) {
            throw new BadRequestException("결제 완료된 예매에만 후기를 등록할 수 있습니다.");
        }

        if (reviewRepository.existsByBookingId(booking.getId())) {
            throw new BadRequestException("이미 후기가 등록된 예매입니다.");
        }

        Review review = Review.builder()
                .user(booking.getUser())
                .concert(concert)
                .booking(booking)
                .rating(dto.rating())
                .content(dto.content())
                .build();

        reviewRepository.save(review);
    }

    @Transactional
    public void updateReview(Long reviewId, ReviewRequest.UpdateDTO dto) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new BadRequestException("수정할 후기를 찾을 수 없습니다."));

        review.updateReview(dto.rating(), dto.content());
    }

    @Transactional
    public void deleteReview(Long reviewId) {
        Review review = reviewRepository.findById(reviewId)
                .orElseThrow(() -> new BadRequestException("삭제할 후기를 찾을 수 없습니다."));

        reviewRepository.delete(review);
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

    private ReviewResponse.AdminBookingOptionDTO toBookingOptionDTO(Booking booking) {
        return new ReviewResponse.AdminBookingOptionDTO(
                booking.getId(),
                booking.getBookingNumber()
                        + " / " + nullToBlank(booking.getUser().getUsername())
                        + " (" + nullToBlank(booking.getUser().getEmail()) + ")"
                        + " / " + formatSession(booking.getConcertSession())
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

    private String formatSession(ConcertSession session) {
        if (session == null) {
            return "";
        }

        String date = session.getSessionDate() == null ? "" : session.getSessionDate().toString();
        String time = session.getSessionTime() == null ? "" : session.getSessionTime().toString();
        String round = session.getRound() == null || session.getRound().isBlank() ? "" : " (" + session.getRound() + ")";
        return date + " " + time + round;
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
