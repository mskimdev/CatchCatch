package com.catchcatch.ticket.ticket;

import com.catchcatch.ticket.booking.Booking;
import com.catchcatch.ticket.booking.BookingRepository;
import com.catchcatch.ticket.booking.bookingSeat.BookingSeat;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.time.LocalDate;
import java.util.Comparator;
import java.util.stream.Collectors;

@Controller
@RequiredArgsConstructor
public class TicketViewController {

    private final BookingRepository bookingRepository;

    @Transactional(readOnly = true)
    @GetMapping("/ticket")
    public String ticketView(@RequestParam String token, Model model) {
        Booking booking = bookingRepository.findByTicketToken(token)
                .orElse(null);

        if (booking == null) {
            model.addAttribute("error", "유효하지 않은 입장권 링크입니다.");
            return "ticket/ticket-view";
        }

        LocalDate sessionDate = booking.getConcertSession().getSessionDate();
        if (LocalDate.now().isAfter(sessionDate)) {
            model.addAttribute("error", "이미 종료된 공연입니다.");
            return "ticket/ticket-view";
        }

        String seatText = booking.getBookingSeats().stream()
                .sorted(Comparator.comparing(bs -> bs.getSeat().getSeatNumber()))
                .map(BookingSeat::getSeat)
                .map(s -> s.getSeatNumber())
                .collect(Collectors.joining(", "));

        model.addAttribute("bookingNumber", booking.getBookingNumber());
        model.addAttribute("concertTitle", booking.getConcertSession().getConcert().getTitle());
        model.addAttribute("sessionText",
                booking.getConcertSession().getSessionDate() + " " +
                booking.getConcertSession().getSessionTime());
        model.addAttribute("venueName", booking.getConcertSession().getConcert().getVenue().getName());
        model.addAttribute("seatText", seatText);
        model.addAttribute("ticketToken", token);

        return "ticket/ticket-view";
    }
}
