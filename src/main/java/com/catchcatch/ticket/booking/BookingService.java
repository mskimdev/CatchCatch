package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeatRepository;
import com.catchcatch.ticket.booking.dto.BookingRequest;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.payment.Payment;
import com.catchcatch.ticket.payment.PaymentRepository;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.seat.SeatStatus;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.session.ConcertSessionRepository;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
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
    private final BookingSeatRepository bookingSeatRepository;
    private final ConcertSessionRepository concertSessionRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;

    /**
     * 예매 생성
     *
     * 좌석 선택 후 다음 단계 클릭 시 실행.
     *
     * 하는 일:
     * 1. User 조회
     * 2. 선택 좌석 조회
     * 3. 선택 좌석이 같은 회차 좌석인지 검증
     * 4. 좌석이 AVAILABLE 상태인지 검증
     * 5. Booking 생성
     * 6. BookingSeat 여러 개 생성
     * 7. Seat AVAILABLE -> HELD 처리
     */
    @Transactional
    public BookingResponse.DetailDTO save(BookingRequest.SaveDTO requestDTO) {
        if (requestDTO == null) {
            throw new BadRequestException("예매 요청 정보가 없습니다.");
        }

        if (requestDTO.getUserId() == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        if (requestDTO.getSessionId() == null) {
            throw new BadRequestException("공연 회차 정보가 없습니다.");
        }

        if (requestDTO.getSeatIds() == null || requestDTO.getSeatIds().isEmpty()) {
            throw new BadRequestException("선택된 좌석이 없습니다.");
        }

        User user = getUserReference(requestDTO.getUserId());

        List<Integer> seatIds = requestDTO.getSeatIds()
                .stream()
                .distinct()
                .toList();

        List<Seat> seats = seatRepository.findAllById(seatIds);

        if (seats.size() != seatIds.size()) {
            throw new BadRequestException("존재하지 않는 좌석이 포함되어 있습니다.");
        }

        validateSeats(requestDTO.getSessionId(), seats);

        ConcertSession concertSession = seats.get(0).getConcertSession();

        Integer totalAmount = seats.stream()
                .mapToInt(Seat::getPrice)
                .sum();

        Booking booking = Booking.builder()
                .user(user)
                .concertSession(concertSession)
                .bookingNumber(createBookingNumber())
                .status(Status.PENDING)
                .totalAmount(totalAmount)
                .expiresAt(createExpiresAt())
                .build();

        for (Seat seat : seats) {
            BookingSeat bookingSeat = BookingSeat.builder()
                    .seat(seat)
                    .price(seat.getPrice())
                    .seatNumberSnapshot(seat.getSeatNumber())
                    .seatGradeSnapshot(seat.getGrade().name())
                    .build();

            booking.addBookingSeat(bookingSeat);

            seat.hold();
        }

        // 결제 없이 예매 완료 처리
        booking.completePayment();

        Booking savedBooking = bookingRepository.save(booking);

        return new BookingResponse.DetailDTO(savedBooking);
    }

    /**
     * 예매 단건 조회
     */
    @Transactional(readOnly = true)
    public BookingResponse.DetailDTO findById(Integer id) {
        Booking booking = findBooking(id);

        return new BookingResponse.DetailDTO(booking);
    }

    /**
     * 사용자별 예매 목록 조회
     *
     * Booking -> BookingSeat -> Seat 구조에 맞게
     * fetch join이 걸린 Repository 메서드를 사용한다.
     */
    @Transactional(readOnly = true)
    public List<BookingResponse.ListDTO> findByUserId(Integer userId) {
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        return bookingRepository.findAllWithDetailsByUserId(userId)
                .stream()
                .map(BookingResponse.ListDTO::new)
                .toList();
    }

    /**
     * 예매 취소 처리
     *
     * PENDING 상태라면 임시 점유 좌석을 다시 AVAILABLE로 돌린다.
     * PAID 상태 취소는 환불 플로우에서 처리하는 것이 좋다.
     */
    @Transactional
    public void cancel(Integer id) {
        Booking booking = findBooking(id);

        if (Status.CANCELED.equals(booking.getStatus())) {
            throw new BadRequestException("이미 취소된 예매입니다.");
        }

        if (Status.PAID.equals(booking.getStatus())) {
            throw new BadRequestException("결제 완료된 예매는 환불 절차를 통해 취소해야 합니다.");
        }

        releaseSeats(booking);
        booking.cancel();
    }

    /**
     * 결제 시간 만료 처리
     *
     * PENDING 상태이고 expiresAt이 지난 예매를 EXPIRED 처리하고,
     * HELD 좌석을 AVAILABLE로 되돌린다.
     */
    @Transactional
    public void expirePendingBookings() {
        List<Booking> expiredBookings =
                bookingRepository.findByStatusAndExpiresAtBefore(Status.PENDING, now());

        expiredBookings.forEach(booking -> {
            releaseSeats(booking);
            booking.expire();
        });
    }

    /**
     * 좌석 선택 화면 정보 조회
     */
    @Transactional(readOnly = true)
    public BookingResponse.SeatFormDTO findSeatForm(Integer sessionId) {
        if (sessionId == null) {
            throw new BadRequestException("공연 회차 정보가 없습니다.");
        }

        List<Seat> seats =
                seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(sessionId);

        Set<Integer> bookedSeatIds =
                bookingSeatRepository.findSeatIdsBySessionIdAndBookingStatusIn(
                                sessionId,
                                List.of(Status.PENDING, Status.PAID)
                        )
                        .stream()
                        .collect(Collectors.toSet());

        return new BookingResponse.SeatFormDTO(seats, bookedSeatIds);
    }

    private void validateSeats(Integer sessionId, List<Seat> seats) {
        for (Seat seat : seats) {
            if (!seat.getConcertSession().getId().equals(sessionId)) {
                throw new BadRequestException("선택한 회차의 좌석이 아닙니다.");
            }

            if (seat.getStatus() != SeatStatus.AVAILABLE) {
                throw new BadRequestException("이미 선택할 수 없는 좌석이 포함되어 있습니다.");
            }
        }
    }

    private void releaseSeats(Booking booking) {
        if (booking.getBookingSeats() == null || booking.getBookingSeats().isEmpty()) {
            return;
        }

        booking.getBookingSeats().forEach(bookingSeat -> {
            Seat seat = bookingSeat.getSeat();

            if (seat != null) {
                seat.release();
            }
        });
    }

    private Booking findBooking(Integer id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("예매 정보를 찾을 수 없습니다."));
    }

    private User getUserReference(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BadRequestException("사용자 정보를 찾을 수 없습니다."));
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

    /**
     * 예매 정보 화면에 필요한 공연/회차 정보를 조회한다.
     *
     * 세션에 저장된 concertId와 sessionId를 검증하고,
     * 해당 회차가 선택한 공연에 속하는지 확인한 뒤 InfoDTO로 반환한다.
     */
    @Transactional(readOnly = true)
    public BookingResponse.InfoDTO findBookingInfo(Integer concertId, Integer sessionId) {
        if (concertId == null) {
            throw new BadRequestException("공연 정보가 없습니다.");
        }

        if (sessionId == null) {
            throw new BadRequestException("공연 회차 정보가 없습니다.");
        }

        ConcertSession concertSession = concertSessionRepository.findById(sessionId)
                .orElseThrow(() -> new BadRequestException("공연 회차 정보를 찾을 수 없습니다."));

        Concert concert = concertSession.getConcert();

        if (!concert.getId().equals(concertId)) {
            throw new BadRequestException("공연 정보가 일치하지 않습니다.");
        }

        // 해당 공연 좌석
        List<Seat> seats = seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(sessionId);

        // 조회한 공연 정보, 공연 회차 정보, 좌석 목록을 예매 정보 화면용 DTO로 변환
        return BookingResponse.InfoDTO.from(concert, concertSession, seats);
    }

    /**
     * 예매 완료 화면 정보 조회
     */
    @Transactional(readOnly = true)
    public BookingResponse.CompleteDTO findCompleteById(Integer bookingId) {
        if (bookingId == null) {
            throw new BadRequestException("예매 정보가 없습니다.");
        }

        Booking booking = bookingRepository.findDetailById(bookingId)
                .orElseThrow(() -> new BadRequestException("예매 정보를 찾을 수 없습니다."));

        return new BookingResponse.CompleteDTO(booking);
    }

    /**
     * 결제 완료 화면 정보 조회
     */
    @Transactional(readOnly = true)
    public BookingResponse.CompleteDTO findCompleteByPaymentId(String paymentId) {
        // 1. paymentId로 결제 데이터를 먼저 찾습니다. (Booking 정보가 함께 묶여서 나옴)
        Payment payment = paymentRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new NotFoundException("결제 내역을 찾을 수 없습니다."));

        // 2. 결제 엔티티 안에 들어있는 Booking 엔티티를 꺼냄
        Booking booking = payment.getBooking();

        // 3. 기존에 사용하시던 DTO 생성 로직에 booking과 payment 데이터를 넣어서 리턴
        return new BookingResponse.CompleteDTO(booking, payment);
    }
}