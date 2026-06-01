package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.user.User;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@RequiredArgsConstructor
@Service
public class BookingService {

    private final BookingRepository bookingRepository;

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
                .concertSessionId(requestDTO.getConcertSessionId())
                .seatId(requestDTO.getSeatId())
                .bookingNumber(createBookingNumber())
                .status("PENDING")
                .expiresAt(Timestamp.valueOf(LocalDateTime.now().plusMinutes(10)))
                .build();

        Booking savedBooking = bookingRepository.save(booking);

        return new BookingResponse.DetailDTO(savedBooking);
    }

    // 예매 단건 조회
    @Transactional(readOnly = true)
    public BookingResponse.DetailDTO findById(Integer id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("예매 정보를 찾을 수 없습니다."));

        return new BookingResponse.DetailDTO(booking);
    }

    // 사용자별 예매 목록 조회
    @Transactional(readOnly = true)
    public List<BookingResponse.ListDTO> findByUserId(Integer userId) {
        return bookingRepository.findByUserId(userId).stream()
                .map(BookingResponse.ListDTO::new)
                .toList();
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

    // 예매 번호 생성
    private String createBookingNumber() {
        return "BOOK-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase();
    }
}