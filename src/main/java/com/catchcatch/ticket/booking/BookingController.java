package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.booking.dto.BookingRequest;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.User;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

@RequiredArgsConstructor
@Controller
@RequestMapping("/booking")
public class BookingController {

    private static final int TEST_CONCERT_ID = 1;
    private static final int TEST_SESSION_ID = 1;

    private static final String SESSION_BOOKING_CONCERT_ID = "bookingConcertId";
    private static final String SESSION_BOOKING_SESSION_ID = "bookingSessionId";
    private static final String SESSION_BOOKING_SEAT_IDS = "bookingSeatIds";
    private static final String SESSION_BOOKING_ID = "bookingId";
    private static final String SESSION_BOOKING_IDS = "bookingIds";

    private final BookingService bookingService;

    @PostMapping("/start")
    public String startBooking(
            BookingRequest.StartDTO req,
            HttpSession session
    ) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        req.validate();

        session.setAttribute(SESSION_BOOKING_CONCERT_ID, req.getConcertId());
        session.setAttribute(SESSION_BOOKING_SESSION_ID, req.getSessionId());

        return "redirect:/booking/seat";
    }

    @GetMapping("/seat")
    public String seatForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer concertId = getSessionInteger(session, SESSION_BOOKING_CONCERT_ID);
        Integer sessionId = getSessionInteger(session, SESSION_BOOKING_SESSION_ID);

        if (concertId == null || sessionId == null) {
            concertId = TEST_CONCERT_ID;
            sessionId = TEST_SESSION_ID;

            session.setAttribute(SESSION_BOOKING_CONCERT_ID, concertId);
            session.setAttribute(SESSION_BOOKING_SESSION_ID, sessionId);
        }

        BookingResponse.SeatFormDTO seat = bookingService.findSeatForm(sessionId);

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());
        model.addAttribute("concertId", concertId);
        model.addAttribute("sessionId", sessionId);
        model.addAttribute("seat", seat);

        return "booking/seat";
    }

    @PostMapping("/payment")
    public String startPayment(
            BookingRequest.PaymentStartDTO req,
            HttpSession session
    ) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        req.validate();

        Integer concertId = getSessionInteger(session, SESSION_BOOKING_CONCERT_ID);
        Integer sessionId = getSessionInteger(session, SESSION_BOOKING_SESSION_ID);

        if (concertId == null) {
            concertId = TEST_CONCERT_ID;
            session.setAttribute(SESSION_BOOKING_CONCERT_ID, concertId);
        }

        if (sessionId == null) {
            sessionId = TEST_SESSION_ID;
            session.setAttribute(SESSION_BOOKING_SESSION_ID, sessionId);
        }

        session.setAttribute(SESSION_BOOKING_SEAT_IDS, req.getSeatIds());

        return "redirect:/booking/payment";
    }

    @GetMapping("/payment")
    public String paymentForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        String seatIds = (String) session.getAttribute(SESSION_BOOKING_SEAT_IDS);

        if (seatIds == null || seatIds.isBlank()) {
            return "redirect:/booking/seat";
        }

        BookingResponse.PaymentDTO paymentDTO =
                bookingService.getPaymentInfo(seatIds, sessionUser);

        model.addAttribute("payment", paymentDTO);

        return "booking/payment";
    }

    @PostMapping("/payment/confirm")
    public String paymentConfirm(HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer sessionId = getSessionInteger(session, SESSION_BOOKING_SESSION_ID);
        String seatIds = (String) session.getAttribute(SESSION_BOOKING_SEAT_IDS);

        if (sessionId == null || seatIds == null || seatIds.isBlank()) {
            return "redirect:/booking/seat";
        }

        List<BookingResponse.DetailDTO> bookings =
                bookingService.saveAllConfirmed(sessionId, seatIds, sessionUser);

        if (bookings.isEmpty()) {
            return "redirect:/booking/seat";
        }

        List<Integer> bookingIds = bookings.stream()
                .map(BookingResponse.DetailDTO::getId)
                .toList();

        session.setAttribute(SESSION_BOOKING_IDS, bookingIds);
        session.setAttribute(SESSION_BOOKING_ID, bookingIds.get(0));

        return "redirect:/booking/complete";
    }

    @GetMapping("/complete")
    public String completeForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer bookingId = getSessionInteger(session, SESSION_BOOKING_ID);

        if (bookingId == null) {
            return "redirect:/";
        }

        BookingResponse.CompleteDTO booking =
                bookingService.findCompleteById(bookingId, sessionUser);

        model.addAttribute("booking", booking);

        return "booking/complete";
    }

    private User getSessionUser(HttpSession session) {
        return (User) session.getAttribute(Define.SESSION_USER);
    }

    private Integer getSessionInteger(HttpSession session, String name) {
        Object value = session.getAttribute(name);

        if (value instanceof Integer integerValue) {
            return integerValue;
        }

        return null;
    }
}