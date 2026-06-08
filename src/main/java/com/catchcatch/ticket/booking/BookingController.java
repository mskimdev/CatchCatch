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

        session.setAttribute("bookingConcertId", req.getConcertId());
        session.setAttribute("bookingSessionId", req.getSessionId());

        return "redirect:/booking/seat";
    }

    @GetMapping("/seat")
    public String seatForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer concertId = getSessionInteger(session, "bookingConcertId");
        Integer sessionId = getSessionInteger(session, "bookingSessionId");

        BookingResponse.SeatFormDTO seat = bookingService.findSeatForm(sessionId);

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());
        model.addAttribute("concertId", concertId);
        model.addAttribute("sessionId", sessionId);
        model.addAttribute("seat", seat);

        return "booking/seat";
    }

    /**
     * 선택한 좌석 정보를 세션에 저장하고 결제 화면으로 이동
     *
     * @param req 선택한 좌석 ID 목록을 담은 요청 DTO
     * @param session 선택 좌석 정보를 저장할 세션
     * @return 결제 화면으로 이동하는 redirect 경로
     */
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

        Integer concertId = getSessionInteger(session, "bookingConcertId");
        Integer sessionId = getSessionInteger(session, "bookingSessionId");

        session.setAttribute("bookingSeatIds", req.getSeatIds());

        return "redirect:/booking/payment";
    }

    @GetMapping("/payment")
    public String paymentForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        // 좌석 1 ~ 4석 예매할 수 있으니
        String seatIds = (String) session.getAttribute("bookingSeatIds");

        if (seatIds == null || seatIds.isBlank()) {
            return "redirect:/booking/seat";
        }

        BookingResponse.PaymentDTO paymentDTO =
                bookingService.getPaymentInfo(seatIds, sessionUser);

        model.addAttribute("payment", paymentDTO);

        return "booking/payment";
    }

    /**
     * 결제 확정 처리
     *
     * 세션에 저장된 회차 ID와 선택 좌석 ID 목록을 기준으로
     * 예매 정보를 DB에 저장한 뒤 예매 완료 화면으로 이동한다.
     *
     * @param session 로그인 사용자 정보, 선택 좌석 정보, 회차 정보를 담고 있는 세션
     * @return 예매 완료 화면으로 이동하는 redirect 경로
     */
    @PostMapping("/payment/confirm")
    public String paymentConfirm(HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer sessionId = getSessionInteger(session, "bookingSessionId");
        String seatIds = (String) session.getAttribute("bookingSeatIds");

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

        session.setAttribute("bookingIds", bookingIds);
        session.setAttribute("bookingId", bookingIds.get(0));

        return "redirect:/booking/complete";
    }

    @GetMapping("/complete")
    public String completeForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer bookingId = getSessionInteger(session, "bookingId");

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