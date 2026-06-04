package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.booking.dto.BookingRequest;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.concert.Concert;
import com.catchcatch.ticket.core.errors.BadRequestException;
import com.catchcatch.ticket.seat.Seat;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.session.ConcertSessionRepository;
import com.catchcatch.ticket.user.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class BookingService {

    private static final int MAX_SEAT_COUNT = 4;
    private static final int PAYMENT_EXPIRE_MINUTES = 10;

    private static final String STATUS_PENDING = "PENDING";
    private static final String STATUS_CONFIRMED = "CONFIRMED";
    private static final String STATUS_PAID = "PAID";
    private static final String STATUS_CANCELED = "CANCELED";
    private static final String STATUS_EXPIRED = "EXPIRED";

    private final BookingRepository bookingRepository;
    private final SeatRepository seatRepository;
    private final ConcertSessionRepository concertSessionRepository;

    /*
     * TODO:
     * UserRepository 생성 후 EntityManager 제거 예정.
     *
     * 변경 예정:
     * - @PersistenceContext 제거
     * - EntityManager 제거
     * - UserRepository 주입
     * - getUserReference() 내부를 userRepository.findById()로 교체
     */
    @PersistenceContext
    private EntityManager entityManager;

    // 예매 생성
    @Transactional
    public BookingResponse.DetailDTO save(BookingRequest.SaveDTO requestDTO) {
        User user = getUserReference(requestDTO.getUserId());

        Booking booking = Booking.builder()
                .user(user)
                .concertSessionId(requestDTO.getConcertSessionId())
                .seatId(requestDTO.getSeatId())
                .bookingNumber(createBookingNumber())
                .status(STATUS_PENDING)
                .expiresAt(createExpiresAt())
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        return new BookingResponse.DetailDTO(savedBooking);
    }

    // 결제 완료 시 선택 좌석 전체 예매 저장
    @Transactional
    public List<BookingResponse.DetailDTO> saveAllConfirmed(
            Integer concertSessionId,
            String seatIds,
            User sessionUser
    ) {
        List<Integer> seatIdList = parseSeatIds(seatIds);
        List<Seat> selectedSeats = findSelectedSeats(seatIdList);
        User user = getUserReference(sessionUser.getId());

        return selectedSeats.stream()
                .map(seat -> createConfirmedBooking(concertSessionId, seat, user))
                .map(bookingRepository::save)
                .map(BookingResponse.DetailDTO::new)
                .toList();
    }

    // 예매 단건 조회
    @Transactional(readOnly = true)
    public BookingResponse.DetailDTO findById(Integer id) {
        Booking booking = findBooking(id);

        return new BookingResponse.DetailDTO(booking);
    }

    // 예매 완료 화면 정보 조회
    @Transactional(readOnly = true)
    public BookingResponse.CompleteDTO findCompleteById(Integer id, User sessionUser) {
        Booking booking = findBooking(id);
        Seat seat = findSeat(booking.getSeatId());
        Concert concert = findConcertBySessionId(booking.getConcertSessionId());

        return new BookingResponse.CompleteDTO(
                booking,
                seat,
                sessionUser,
                concert.getTitle()
        );
    }

    // 사용자별 예매 목록 조회
    @Transactional(readOnly = true)
    public List<BookingResponse.ListDTO> findByUserId(Integer userId) {
        return bookingRepository.findByUserId(userId).stream()
                .map(BookingResponse.ListDTO::new)
                .toList();
    }

    // 결제 화면 정보 조회
    @Transactional(readOnly = true)
    public BookingResponse.PaymentDTO getPaymentInfo(String seatIds, User sessionUser) {
        List<Integer> seatIdList = parseSeatIds(seatIds);
        List<Seat> selectedSeats = findSelectedSeats(seatIdList);

        return new BookingResponse.PaymentDTO(seatIds, selectedSeats, sessionUser);
    }

    // 결제 완료 처리
    @Transactional
    public BookingResponse.DetailDTO pay(Integer id) {
        Booking booking = findBooking(id);

        if (!STATUS_PENDING.equals(booking.getStatus())) {
            throw new BadRequestException("결제 가능한 상태가 아닙니다.");
        }

        booking.setStatus(STATUS_PAID);

        return new BookingResponse.DetailDTO(booking);
    }

    // 예매 취소 처리
    @Transactional
    public void cancel(Integer id) {
        Booking booking = findBooking(id);

        if (STATUS_CANCELED.equals(booking.getStatus())) {
            throw new BadRequestException("이미 취소된 예매입니다.");
        }

        booking.setStatus(STATUS_CANCELED);
        booking.setCanceledAt(now());
    }

    // 결제 시간 만료 처리
    @Transactional
    public void expirePendingBookings() {
        List<Booking> expiredBookings =
                bookingRepository.findByStatusAndExpiresAtBefore(STATUS_PENDING, now());

        expiredBookings.forEach(booking -> booking.setStatus(STATUS_EXPIRED));
    }

    // 좌석 선택 화면 정보 조회
    @Transactional(readOnly = true)
    public BookingResponse.SeatFormDTO findSeatForm(Integer sessionId) {
        List<Seat> seats = seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(sessionId);

        return new BookingResponse.SeatFormDTO(seats);
    }

    // ============================================================
    // private 메서드
    // ============================================================

    private Booking findBooking(Integer id) {
        return bookingRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("예매 정보를 찾을 수 없습니다."));
    }

    private Seat findSeat(Integer seatId) {
        return seatRepository.findById(seatId)
                .orElseThrow(() -> new BadRequestException("좌석 정보를 찾을 수 없습니다."));
    }

    private Concert findConcertBySessionId(Integer concertSessionId) {
        ConcertSession concertSession = concertSessionRepository.findById(concertSessionId)
                .orElseThrow(() -> new BadRequestException("공연 회차 정보를 찾을 수 없습니다."));

        return concertSession.getConcert();
    }

    private User getUserReference(Integer userId) {
        return entityManager.getReference(User.class, userId);
    }

    private Booking createConfirmedBooking(Integer concertSessionId, Seat seat, User user) {
        return Booking.builder()
                .user(user)
                .concertSessionId(concertSessionId)
                .seatId(seat.getId())
                .bookingNumber(createBookingNumber())
                .status(STATUS_CONFIRMED)
                .expiresAt(null)
                .build();
    }

    private List<Integer> parseSeatIds(String seatIds) {
        if (seatIds == null || seatIds.isBlank()) {
            throw new BadRequestException("좌석 정보가 없습니다.");
        }

        List<Integer> seatIdList = Arrays.stream(seatIds.split(","))
                .map(String::trim)
                .filter(id -> !id.isBlank())
                .map(this::parseSeatId)
                .toList();

        validateSeatIdList(seatIdList);

        return seatIdList;
    }

    private Integer parseSeatId(String seatId) {
        try {
            return Integer.parseInt(seatId);
        } catch (NumberFormatException e) {
            throw new BadRequestException("좌석 정보가 올바르지 않습니다.");
        }
    }

    private void validateSeatIdList(List<Integer> seatIdList) {
        if (seatIdList.isEmpty()) {
            throw new BadRequestException("좌석 정보가 없습니다.");
        }

        if (seatIdList.size() > MAX_SEAT_COUNT) {
            throw new BadRequestException("좌석은 최대 4석까지 선택할 수 있습니다.");
        }

        long distinctCount = seatIdList.stream()
                .distinct()
                .count();

        if (distinctCount != seatIdList.size()) {
            throw new BadRequestException("중복된 좌석이 포함되어 있습니다.");
        }
    }

    private List<Seat> findSelectedSeats(List<Integer> seatIdList) {
        Map<Integer, Seat> seatMap = seatRepository.findAllById(seatIdList).stream()
                .collect(Collectors.toMap(Seat::getId, Function.identity()));

        if (seatMap.size() != seatIdList.size()) {
            throw new BadRequestException("존재하지 않는 좌석이 포함되어 있습니다.");
        }

        return seatIdList.stream()
                .map(seatMap::get)
                .sorted(Comparator.comparing(Seat::getSeatNumber))
                .toList();
    }

    private String createBookingNumber() {
        return "BOOK-" + UUID.randomUUID()
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