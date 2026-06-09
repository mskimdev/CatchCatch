package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.booking.dto.BookingRequest;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.core.errors.BadRequestException;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class BookingService {

    private static final int PAYMENT_EXPIRE_MINUTES = 10;

    private final BookingRepository bookingRepository;
    private final SeatRepository seatRepository;

    @PersistenceContext
    private EntityManager entityManager;

    // 예매 생성
    @Transactional
    public BookingResponse.DetailDTO save(BookingRequest.SaveDTO requestDTO) {
        User user = getUserReference(requestDTO.getUserId());

        Booking booking = Booking.builder()
                .user(user)
                .bookingNumber(createBookingNumber())
                .status(Status.PENDING)
                .expiresAt(createExpiresAt())
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        return new BookingResponse.DetailDTO(savedBooking);
    }

    // 예매 단건 조회
    @Transactional(readOnly = true)
    public BookingResponse.DetailDTO findById(Integer id) {
        Booking booking = findBooking(id);

        return new BookingResponse.DetailDTO(booking);
    }

    // 사용자별 예매 목록 조회
    @Transactional(readOnly = true)
    public List<BookingResponse.ListDTO> findByUserId(Integer userId) {
        return bookingRepository.findByUserId(userId).stream()
                .map(BookingResponse.ListDTO::new)
                .toList();
    }

    // 예매 취소 처리
    @Transactional
    public void cancel(Integer id) {
        Booking booking = findBooking(id);

        if (Status.CANCELLED.equals(booking.getStatus())) {
            throw new BadRequestException("이미 취소된 예매입니다.");
        }

        booking.setStatus(Status.CANCELLED);
        booking.setCanceledAt(now());
    }

    // 결제 시간 만료 처리
    @Transactional
    public void expirePendingBookings() {
        List<Booking> expiredBookings =
                bookingRepository.findByStatusAndExpiresAtBefore("PENDING", now());

        expiredBookings.forEach(booking -> booking.setStatus(Status.EXPIRED));
    }

    // 좌석 선택 화면 정보 조회
    @Transactional(readOnly = true)
    public BookingResponse.SeatFormDTO findSeatForm(Integer sessionId) {
        if (sessionId == null) {
            throw new BadRequestException("공연 회차 정보가 없습니다.");
        }

        List<Seat> seats = seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(sessionId);

        Set<Integer> bookedSeatIds = bookingRepository.findByConcertSessionIdAndStatusIn(
                        sessionId,
                        List.of("PENDING", "CONFIRMED")
                )
                .stream()
                .map(booking -> booking.getSeat().getId())
                .collect(Collectors.toSet());

        return new BookingResponse.SeatFormDTO(seats, bookedSeatIds);
    }

    private Booking findBooking(Integer id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("예매 정보를 찾을 수 없습니다."));
    }

    private User getUserReference(Integer userId) {
        return entityManager.getReference(User.class, userId);
    }

    private String createBookingNumber() {
        return "BK-" + UUID.randomUUID()
                .toString()
                .substring(0, 8)
                .toUpperCase();
    }

    private Timestamp createExpiresAt() {
        return Timestamp.valueOf(LocalDateTime.now().plusMinutes(PAYMENT_EXPIRE_MINUTES));
    }

    private Timestamp now() {
        return Timestamp.valueOf(LocalDateTime.now());
    }
}