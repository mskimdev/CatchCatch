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
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RequiredArgsConstructor
@Service
public class BookingService {

    private final BookingRepository bookingRepository;
    private final SeatRepository seatRepository;
    private final ConcertSessionRepository concertSessionRepository;

    /*
    ============================================================
    TODO [임시 User 처리 영역]
    ------------------------------------------------------------
    현재 UserRepository가 아직 없어서 EntityManager로 User 프록시 객체를 임시 생성함.

    나중에 UserRepository가 생성되면 아래 작업 필요:

    1. EntityManager 관련 코드 삭제
       - @PersistenceContext
       - private EntityManager entityManager;

    2. UserRepository 주입 코드 추가
       - private final UserRepository userRepository;

    3. save() 메서드 안의 임시 User 생성 코드 교체
       - entityManager.getReference(...)
       ↓
       - userRepository.findById(...)
    ============================================================
    */
    @PersistenceContext
    private EntityManager entityManager;
    /*
    ============================================================
    TODO [임시 User 처리 영역 끝]
    ============================================================
    */

    // 예매 생성
    @Transactional
    public BookingResponse.DetailDTO save(BookingRequest.SaveDTO requestDTO) {

        /*
        ============================================================
        TODO [임시 User 조회 코드]
        ------------------------------------------------------------
        UserRepository 생성 후 이 블록 삭제하고 아래 정식 코드로 교체할 것.

        정식 코드 예시:

        User user = userRepository.findById(requestDTO.getUserId())
                .orElseThrow(() -> new RuntimeException("사용자를 찾을 수 없습니다."));
        ============================================================
        */
        User user = entityManager.getReference(User.class, requestDTO.getUserId());
        /*
        ============================================================
        TODO [임시 User 조회 코드 끝]
        ============================================================
        */

        Booking booking = Booking.builder()
                .user(user)
                // .concertSessionId(requestDTO.getConcertSessionId())
                // .seatId(requestDTO.getSeatId())
                .bookingNumber(createBookingNumber())
                .status("PENDING")
                .expiresAt(Timestamp.valueOf(LocalDateTime.now().plusMinutes(10)))
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

        User user = entityManager.getReference(User.class, sessionUser.getId());

        List<BookingResponse.DetailDTO> result = new ArrayList<>();

        for (Seat seat : selectedSeats) {
            Booking booking = Booking.builder()
                    .user(user)
                    //.concertSessionId(concertSessionId)
                    //.seatId(seat.getId())
                    .bookingNumber(createBookingNumber())
                    .status("CONFIRMED")
                    .expiresAt(null)
                    .build();

            Booking savedBooking = bookingRepository.save(booking);

            result.add(new BookingResponse.DetailDTO(savedBooking));
        }

        return result;
    }

    // 예매 단건 조회
    @Transactional(readOnly = true)
    public BookingResponse.DetailDTO findById(Integer id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("예매 정보를 찾을 수 없습니다."));

        return new BookingResponse.DetailDTO(booking);
    }

    // 예매 완료 화면 정보 조회
    @Transactional(readOnly = true)
    public BookingResponse.CompleteDTO findCompleteById(Integer id, User sessionUser) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new BadRequestException("예매 정보를 찾을 수 없습니다."));

        Seat seat = seatRepository.findById(booking.getSeat().getId())
                .orElseThrow(() -> new BadRequestException("좌석 정보를 찾을 수 없습니다."));

        ConcertSession concertSession = concertSessionRepository.findById(booking.getConcertSession().getId())
                .orElseThrow(() -> new BadRequestException("공연 회차 정보를 찾을 수 없습니다."));

        Concert concert = concertSession.getConcert();

        String concertTitle = concert.getTitle();

        return new BookingResponse.CompleteDTO(
                booking,
                seat,
                sessionUser,
                concertTitle
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
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("예매 정보를 찾을 수 없습니다."));

        if (!booking.getStatus().equals("PENDING")) {
            throw new RuntimeException("결제 가능한 상태가 아닙니다.");
        }

        booking.setStatus("PAID");

        return new BookingResponse.DetailDTO(booking);
    }

    // 예매 취소 처리
    @Transactional
    public void cancel(Integer id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("예매 정보를 찾을 수 없습니다."));

        if (booking.getStatus().equals("CANCELED")) {
            throw new RuntimeException("이미 취소된 예매입니다.");
        }

        booking.setStatus("CANCELED");
        booking.setCanceledAt(Timestamp.valueOf(LocalDateTime.now()));
    }

    // 결제 시간 만료 처리
    @Transactional
    public void expirePendingBookings() {
        Timestamp now = Timestamp.valueOf(LocalDateTime.now());

        List<Booking> expiredBookings =
                bookingRepository.findByStatusAndExpiresAtBefore("PENDING", now);

        for (Booking booking : expiredBookings) {
            booking.setStatus("EXPIRED");
        }
    }

    // ============================================================
    // 결제 화면 좌석 조회 관련 private 메서드
    // ============================================================

    // seatIds 문자열을 Integer 리스트로 변환
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

    // seatId 문자열 하나를 Integer로 변환
    private Integer parseSeatId(String seatId) {
        try {
            return Integer.parseInt(seatId);
        } catch (NumberFormatException e) {
            throw new BadRequestException("좌석 정보가 올바르지 않습니다.");
        }
    }

    // 좌석 ID 목록 기본 검증
    private void validateSeatIdList(List<Integer> seatIdList) {
        if (seatIdList == null || seatIdList.isEmpty()) {
            throw new BadRequestException("좌석 정보가 없습니다.");
        }

        if (seatIdList.size() > 4) {
            throw new BadRequestException("좌석은 최대 4석까지 선택할 수 있습니다.");
        }

        long distinctCount = seatIdList.stream()
                .distinct()
                .count();

        if (distinctCount != seatIdList.size()) {
            throw new BadRequestException("중복된 좌석이 포함되어 있습니다.");
        }
    }

    // 선택한 좌석 ID 목록으로 Seat 조회 후, 요청 순서대로 정렬
    private List<Seat> findSelectedSeats(List<Integer> seatIdList) {
        List<Seat> foundSeats = seatRepository.findAllById(seatIdList);

        if (foundSeats.size() != seatIdList.size()) {
            throw new BadRequestException("존재하지 않는 좌석이 포함되어 있습니다.");
        }

        Map<Integer, Seat> seatMap = foundSeats.stream()
                .collect(Collectors.toMap(Seat::getId, seat -> seat));

        List<Seat> orderedSeats = new ArrayList<>();

        for (Integer seatId : seatIdList) {
            Seat seat = seatMap.get(seatId);

            if (seat == null) {
                throw new BadRequestException("존재하지 않는 좌석이 포함되어 있습니다.");
            }

            orderedSeats.add(seat);
        }

        return orderedSeats;
    }

    // 예매 번호 생성
    private String createBookingNumber() {
        return "BOOK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }





}