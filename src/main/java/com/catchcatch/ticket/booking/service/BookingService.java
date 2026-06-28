package com.catchcatch.ticket.booking.service;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.booking.bookingSeat.repository.BookingSeatRepository;
import com.catchcatch.ticket.booking.dto.BookingRequest;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.booking.enums.Status;
import com.catchcatch.ticket.booking.repository.BookingRepository;
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

@Service
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class BookingService {

    private static final int PAYMENT_EXPIRE_MINUTES = 10;

    private final BookingRepository bookingRepository;
    private final SeatRepository seatRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final ConcertSessionRepository concertSessionRepository;
    private final UserRepository userRepository;
    private final PaymentRepository paymentRepository;

    @Transactional
    public BookingResponse.DetailDTO save(Integer userId, BookingRequest.SaveDTO requestDTO) {
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        if (requestDTO == null) {
            throw new BadRequestException("예매 요청 정보가 없습니다.");
        }

        requestDTO.validate();

        User user = getUser(userId);
        List<Integer> seatIds = requestDTO.seatIds()
                .stream()
                .distinct()
                .toList();
        List<Seat> seats = seatRepository.findAllById(seatIds);

        if (seats.size() != seatIds.size()) {
            throw new BadRequestException("존재하지 않는 좌석이 포함되어 있습니다.");
        }

        validateSeats(requestDTO.sessionId(), seats);

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
            booking.addBookingSeat(BookingSeat.create(seat));
            seat.hold();
        }

        Booking savedBooking = bookingRepository.save(booking);
        return new BookingResponse.DetailDTO(savedBooking);
    }

    public BookingResponse.DetailDTO getDetail(Integer id) {
        Booking booking = getBookingDetail(id);
        return new BookingResponse.DetailDTO(booking);
    }

    public List<BookingResponse.ListDTO> getListByUserId(Integer userId) {
        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        return bookingRepository.findAllWithDetailsByUserId(userId)
                .stream()
                .map(BookingResponse.ListDTO::new)
                .toList();
    }

    @Transactional
    public void cancel(Integer id) {
        Booking booking = getBookingDetail(id);

        cancelSoldSeats(booking);
        booking.cancel();
    }

    @Transactional
    public void expirePendingBookings() {
        List<Booking> expiredBookings = bookingRepository.findExpiredBookings(Status.PENDING, now());

        expiredBookings.forEach(booking -> {
            releaseSeats(booking);
            booking.expire();
        });
    }

    public BookingResponse.SeatFormDTO getSeatForm(Integer sessionId) {
        if (sessionId == null) {
            throw new BadRequestException("공연 회차 정보가 없습니다.");
        }

        List<Seat> seats = seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(sessionId);
        Set<Integer> bookedSeatIds = bookingSeatRepository.findSeatIdsBySessionIdAndBookingStatusIn(
                        sessionId,
                        List.of(Status.PENDING, Status.PAID)
                )
                .stream()
                .collect(Collectors.toSet());

        return new BookingResponse.SeatFormDTO(seats, bookedSeatIds);
    }

    public BookingResponse.InfoDTO getBookingInfo(Integer concertId, Integer sessionId) {
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

        List<Seat> seats = seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(sessionId);
        return BookingResponse.InfoDTO.from(concert, concertSession, seats);
    }

    public BookingResponse.CompleteDTO getComplete(Integer bookingId, Integer userId) {
        if (bookingId == null) {
            throw new BadRequestException("예매 정보가 없습니다.");
        }

        if (userId == null) {
            throw new BadRequestException("사용자 정보가 없습니다.");
        }

        Booking booking = bookingRepository.findDetailByIdAndUserId(bookingId, userId)
                .orElseThrow(() -> new BadRequestException("예매 정보를 찾을 수 없습니다."));

        return new BookingResponse.CompleteDTO(booking);
    }

    public BookingResponse.CompleteDTO getCompleteByPaymentId(String paymentId) {
        Payment payment = paymentRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new NotFoundException("결제 내역을 찾을 수 없습니다."));

        return new BookingResponse.CompleteDTO(payment.getBooking(), payment);
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
        safeBookingSeats(booking).forEach(bookingSeat -> {
            Seat seat = bookingSeat.getSeat();

            if (seat != null) {
                seat.release();
            }
        });
    }

    private void cancelSoldSeats(Booking booking) {
        safeBookingSeats(booking).forEach(bookingSeat -> {
            Seat seat = bookingSeat.getSeat();

            if (seat != null) {
                seat.cancelSale();
            }
        });
    }

    private List<BookingSeat> safeBookingSeats(Booking booking) {
        if (booking.getBookingSeats() == null) {
            return List.of();
        }

        return booking.getBookingSeats();
    }

    private Booking getBookingDetail(Integer id) {
        if (id == null) {
            throw new BadRequestException("예매 정보가 없습니다.");
        }

        return bookingRepository.findDetailById(id)
                .orElseThrow(() -> new BadRequestException("예매 정보를 찾을 수 없습니다."));
    }

    private User getUser(Integer userId) {
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

    // todo PaymentController에서 사용중임.
    @Transactional(readOnly = true)
    public BookingResponse.CompleteDTO findCompleteByPaymentId(String paymentId) {
        Payment payment = paymentRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new NotFoundException("결제 내역을 찾을 수 없습니다."));
        Booking booking = payment.getBooking();
        return new BookingResponse.CompleteDTO(booking, payment);
    }
}
