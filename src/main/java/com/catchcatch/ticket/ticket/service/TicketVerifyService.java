package com.catchcatch.ticket.ticket.service;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.ticket.dto.TicketResponse;
import com.catchcatch.ticket.ticket.dto.TicketVerifyResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TicketVerifyService {

    private final BookingRepository bookingRepository;

    public TicketResponse.ViewDTO getTicketView(String token) {
        Booking booking = bookingRepository.findByTicketToken(token)
                .orElse(null);

        if (booking == null) {
            return TicketResponse.ViewDTO.invalid("유효하지 않은 입장권 링크입니다.");
        }

        LocalDate sessionDate = booking.getConcertSession().getSessionDate();

        if (LocalDate.now().isAfter(sessionDate)) {
            return TicketResponse.ViewDTO.invalid("이미 종료된 공연입니다.");
        }

        String seatText = booking.getBookingSeats().stream()
                .sorted(Comparator.comparing(bs -> bs.getSeat().getSeatNumber()))
                .map(BookingSeat::getSeat)
                .map(seat -> seat.getSeatNumber())
                .collect(Collectors.joining(", "));

        return new TicketResponse.ViewDTO(
                true,
                "입장권 조회 성공",
                booking.getBookingNumber(),
                booking.getConcertSession().getConcert().getTitle(),
                booking.getConcertSession().getSessionDate() + " " +
                        booking.getConcertSession().getSessionTime(),
                booking.getConcertSession().getConcert().getVenue().getName(),
                seatText,
                token
        );
    }

    public TicketVerifyResponse verify(String token) {
        Booking booking = bookingRepository.findByTicketToken(token)
                .orElse(null);

        if (booking == null) {
            return TicketVerifyResponse.invalid("존재하지 않는 입장권입니다.");
        }

        if (isInvalidTicket(booking)) {
            return createResponse(false, booking.isCheckedIn(), "유효하지 않은 입장권입니다.", booking);
        }

        if (booking.isCheckedIn()) {
            return createResponse(true, true, "이미 입장 처리된 입장권입니다.", booking);
        }

        return createResponse(true, false, "입장 가능한 입장권입니다.", booking);
    }

    @Transactional
    public TicketVerifyResponse checkIn(String token) {
        Booking booking = bookingRepository.findByTicketToken(token)
                .orElseThrow(() -> new BadRequestException("존재하지 않는 입장권입니다."));

        if (isInvalidTicket(booking)) {
            throw new BadRequestException("유효하지 않은 입장권입니다.");
        }

        if (booking.isCheckedIn()) {
            throw new BadRequestException("이미 입장 처리된 입장권입니다.");
        }

        booking.checkIn();

        return createResponse(true, true, "입장 처리되었습니다.", booking);
    }

    public String findTokenByTicketCode(String ticketCode) {
        if (ticketCode == null || ticketCode.isBlank()) {
            throw new BadRequestException("입장 코드를 입력해주세요.");
        }

        Booking booking = bookingRepository.findByTicketCode(ticketCode.trim().toUpperCase())
                .orElseThrow(() -> new BadRequestException("존재하지 않는 입장 코드입니다."));

        return booking.getTicketToken();
    }

    private boolean isInvalidTicket(Booking booking) {
        return booking.getStatus() != Status.PAID || booking.getCanceledAt() != null;
    }

    private TicketVerifyResponse createResponse(boolean valid,
                                                boolean checkedIn,
                                                String message,
                                                Booking booking) {
        return new TicketVerifyResponse(
                valid,
                checkedIn,
                message,
                booking.getBookingNumber(),
                booking.getConcertSession().getConcert().getTitle(),
                booking.getConcertSession().getConcert().getVenue().getName(),
                booking.getUser().getUsername()
        );
    }
}