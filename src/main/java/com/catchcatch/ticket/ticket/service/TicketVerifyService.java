package com.catchcatch.ticket.ticket;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.ticket.dto.TicketVerifyResponse;
import com.catchcatch.ticket.core.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TicketVerifyService {

    private final BookingRepository bookingRepository;

    @Transactional(readOnly = true)
    public TicketVerifyResponse verify(String token) {
        Booking booking = bookingRepository.findByTicketToken(token)
                .orElse(null);

        if (booking == null) {
            return TicketVerifyResponse.invalid("존재하지 않는 입장권입니다.");
        }

        if (booking.getStatus() != Status.PAID || booking.getCanceledAt() != null) {
            return new TicketVerifyResponse(
                    false,
                    booking.isCheckedIn(),
                    "유효하지 않은 입장권입니다.",
                    booking.getBookingNumber(),
                    booking.getConcertSession().getConcert().getTitle(),
                    booking.getConcertSession().getConcert().getVenue().getName(),
                    booking.getUser().getUsername()
            );
        }

        if (booking.isCheckedIn()) {
            return new TicketVerifyResponse(
                    true,
                    true,
                    "이미 입장 처리된 입장권입니다.",
                    booking.getBookingNumber(),
                    booking.getConcertSession().getConcert().getTitle(),
                    booking.getConcertSession().getConcert().getVenue().getName(),
                    booking.getUser().getUsername()
            );
        }

        return new TicketVerifyResponse(
                true,
                false,
                "입장 가능한 입장권입니다.",
                booking.getBookingNumber(),
                booking.getConcertSession().getConcert().getTitle(),
                booking.getConcertSession().getConcert().getVenue().getName(),
                booking.getUser().getUsername()
        );
    }

    @Transactional
    public TicketVerifyResponse checkIn(String token) {
        Booking booking = bookingRepository.findByTicketToken(token)
                .orElseThrow(() -> new BadRequestException("존재하지 않는 입장권입니다."));

        if (booking.getStatus() != Status.PAID || booking.getCanceledAt() != null) {
            throw new BadRequestException("유효하지 않은 입장권입니다.");
        }

        if (booking.isCheckedIn()) {
            throw new BadRequestException("이미 입장 처리된 입장권입니다.");
        }

        booking.checkIn();

        return new TicketVerifyResponse(
                true,
                true,
                "입장 처리되었습니다.",
                booking.getBookingNumber(),
                booking.getConcertSession().getConcert().getTitle(),
                booking.getConcertSession().getConcert().getVenue().getName(),
                booking.getUser().getUsername()
        );
    }

    @Transactional(readOnly = true)
    public String findTokenByTicketCode(String ticketCode) {
        Booking booking = bookingRepository.findByTicketCode(ticketCode.trim().toUpperCase())
                .orElseThrow(() -> new BadRequestException("존재하지 않는 입장 코드입니다."));

        return booking.getTicketToken();
    }

}