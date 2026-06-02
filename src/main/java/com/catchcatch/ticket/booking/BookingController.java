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

@RequiredArgsConstructor
@Controller
@RequestMapping("/booking")
public class BookingController {

    private final BookingService bookingService;

    // 예매하기 버튼 클릭 시 예매 시작 처리
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

    // URL: http://localhost:8080/booking/seat
    // 좌석 선택 화면으로 이동
    @GetMapping("/seat")
    public String seatForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer concertId = (Integer) session.getAttribute("bookingConcertId");
        Integer sessionId = (Integer) session.getAttribute("bookingSessionId");

        if (concertId == null || sessionId == null) {
            return "redirect:/";
        }

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());
        model.addAttribute("concertId", concertId);
        model.addAttribute("sessionId", sessionId);

        // TODO: 나중에 좌석 목록, 좌석 등급, 공연 정보 model에 추가

        return "booking/seat";
    }

    // URL: http://localhost:8080/booking/payment
    // 좌석 선택 후 결제 단계 진입 처리
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

        Integer sessionId = (Integer) session.getAttribute("bookingSessionId");

        if (sessionId == null) {
            return "redirect:/";
        }

        BookingRequest.SaveDTO saveDTO = new BookingRequest.SaveDTO();
        saveDTO.setUserId(sessionUser.getId());
        saveDTO.setConcertSessionId(sessionId);
        saveDTO.setSeatId(req.getSeatId());

        BookingResponse.DetailDTO booking = bookingService.save(saveDTO);

        session.setAttribute("bookingId", booking.getId());

        return "redirect:/booking/payment";
    }

    // URL: http://localhost:8080/booking/payment
    // 결제 화면으로 이동
    @GetMapping("/payment")
    public String paymentForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer bookingId = (Integer) session.getAttribute("bookingId");

        if (bookingId == null) {
            return "redirect:/booking/seat";
        }

        BookingResponse.DetailDTO booking = bookingService.findById(bookingId);

        model.addAttribute("booking", booking);
        model.addAttribute("bookingId", booking.getId());
        model.addAttribute("merchantUid", booking.getBookingNumber());

        // TODO: 나중에 seatId 기준으로 실제 좌석명/가격 조회
        model.addAttribute("concertTitle", "테스트 콘서트");
        model.addAttribute("seatName", "A-1");
        model.addAttribute("price", 50000);

        model.addAttribute("totalPrice", 50000);
        model.addAttribute("totalPriceText", "50,000원");
        model.addAttribute("ticketPriceText", "50,000원");
        model.addAttribute("feeText", "0원");

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());

        return "booking/payment";
    }

    // URL: http://localhost:8080/booking/payment/confirm
    // 결제하기 버튼 클릭 시 결제 요청 처리
    @PostMapping("/payment/confirm")
    public String paymentConfirm(
            BookingRequest.PaymentConfirmDTO req,
            HttpSession session
    ) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        req.validate();

        BookingResponse.DetailDTO booking = bookingService.pay(req.getBookingId());

        session.setAttribute("bookingId", booking.getId());

        return "redirect:/booking/complete";
    }

    // URL: http://localhost:8080/booking/complete
    // 예매 완료 화면으로 이동
    @GetMapping("/complete")
    public String completeForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer bookingId = (Integer) session.getAttribute("bookingId");

        if (bookingId == null) {
            return "redirect:/";
        }

        BookingResponse.DetailDTO booking = bookingService.findById(bookingId);

        model.addAttribute("booking", booking);
        model.addAttribute("bookingId", booking.getId());
        model.addAttribute("merchantUid", booking.getBookingNumber());

        // TODO: 나중에 실제 공연/좌석 정보로 교체
        model.addAttribute("concertTitle", "테스트 콘서트");
        model.addAttribute("seatName", "A-1");
        model.addAttribute("price", 50000);
        model.addAttribute("totalPriceText", "50,000원");

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());

        return "booking/complete";
    }

    private User getSessionUser(HttpSession session) {
        return (User) session.getAttribute(Define.SESSION_USER);
    }
}