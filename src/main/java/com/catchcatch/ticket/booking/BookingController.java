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

        /*
         * TODO: 현재 좌석 선택/예매 저장 테스트를 위해 아이유 콘서트 1회차로 고정
         *
         * 테스트 DB 기준:
         * concert_tb.id = 1  -> 아이유 콘서트
         * concert_session_tb.id = 1 -> 아이유 2025-08-01 18:00 회차
         *
         * 추후 공연 상세 페이지에서 넘어오는 concertId, sessionId를 정상 사용하도록 변경 예정
         */
        if (concertId == null || sessionId == null) {
            concertId = 1;
            sessionId = 1;

            session.setAttribute("bookingConcertId", concertId);
            session.setAttribute("bookingSessionId", sessionId);
        }

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());
        model.addAttribute("concertId", concertId);
        model.addAttribute("sessionId", sessionId);

        // TODO: 나중에 좌석 목록, 좌석 등급, 공연 정보 model에 추가
        // TODO: 현재는 프론트 테스트 좌석 UI를 사용하고, seatId만 DB의 seat_tb.id와 맞춰서 전달

        return "booking/seat";
    }

    @PostMapping("/payment")
    public String startPayment(
            BookingRequest.PaymentStartDTO req,
            HttpSession session
    ) {
        User sessionUser = getSessionUser(session);

        System.out.println("===== /booking/payment POST 진입 =====");
        System.out.println("sessionUser = " + sessionUser);
        System.out.println("req.seatId = " + req.getSeatId());
        System.out.println("session bookingSessionId = " + session.getAttribute("bookingSessionId"));

        if (sessionUser == null) {
            return "redirect:/login";
        }

        req.validate();

        Integer sessionId = (Integer) session.getAttribute("bookingSessionId");

        /*
         * TODO: 좌석 선택 저장 테스트용 아이유 콘서트 1회차 고정
         */
        if (sessionId == null) {
            sessionId = 1;
            session.setAttribute("bookingSessionId", sessionId);
        }

        BookingRequest.SaveDTO saveDTO = new BookingRequest.SaveDTO();
        saveDTO.setUserId(sessionUser.getId());
        saveDTO.setConcertSessionId(sessionId);
        saveDTO.setSeatId(req.getSeatId());

        System.out.println("saveDTO.userId = " + saveDTO.getUserId());
        System.out.println("saveDTO.concertSessionId = " + saveDTO.getConcertSessionId());
        System.out.println("saveDTO.seatId = " + saveDTO.getSeatId());

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