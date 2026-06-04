package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.booking.dto.BookingRequest;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.User;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

@RequiredArgsConstructor
@Controller
@RequestMapping("/booking")
@Slf4j
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
        // TODO: 현재는 프론트 테스트 좌석 UI를 사용하고, seatIds만 DB의 seat_tb.id와 맞춰서 전달

        return "booking/seat";
    }

    // 좌석 선택 후 결제 화면으로 이동
    @PostMapping("/payment")
    public String startPayment(
            BookingRequest.PaymentStartDTO req,
            HttpSession session
    ) {
        User sessionUser = getSessionUser(session);

        log.info("===== /booking/payment POST 진입 =====");
        log.info("sessionUser = {}", sessionUser);
        log.info("req.seatIds = {}", req.getSeatIds());
        log.info("session bookingConcertId = {}", session.getAttribute("bookingConcertId"));
        log.info("session bookingSessionId = {}", session.getAttribute("bookingSessionId"));

        if (sessionUser == null) {
            log.warn("비로그인 사용자가 /booking/payment POST 요청");
            return "redirect:/login";
        }

        req.validate();

        Integer concertId = (Integer) session.getAttribute("bookingConcertId");
        Integer sessionId = (Integer) session.getAttribute("bookingSessionId");

        /*
         * TODO: 좌석 선택 테스트용 기본값
         * 추후 concert/detail에서 넘어온 concertId, sessionId만 사용하도록 변경
         */
        if (concertId == null) {
            concertId = 1;
            session.setAttribute("bookingConcertId", concertId);
            log.warn("bookingConcertId가 없어 테스트값 concertId=1 세팅");
        }

        if (sessionId == null) {
            sessionId = 1;
            session.setAttribute("bookingSessionId", sessionId);
            log.warn("bookingSessionId가 없어 테스트값 sessionId=1 세팅");
        }

        String seatIds = req.getSeatIds();

        session.setAttribute("bookingSeatIds", seatIds);

        log.info("선택 좌석 ID 목록 세션 저장 완료");
        log.info("bookingConcertId = {}", concertId);
        log.info("bookingSessionId = {}", sessionId);
        log.info("bookingSeatIds = {}", seatIds);

        String[] seatIdArray = seatIds.split(",");
        for (int i = 0; i < seatIdArray.length; i++) {
            log.info("선택 좌석 [{}] seatId = {}", i + 1, seatIdArray[i].trim());
        }

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

        String seatIds = (String) session.getAttribute("bookingSeatIds");
        Integer concertId = (Integer) session.getAttribute("bookingConcertId");
        Integer sessionId = (Integer) session.getAttribute("bookingSessionId");

        log.info("===== /booking/payment GET 진입 =====");
        log.info("sessionUser.id = {}", sessionUser.getId());
        log.info("sessionUser.username = {}", sessionUser.getUsername());
        log.info("bookingConcertId = {}", concertId);
        log.info("bookingSessionId = {}", sessionId);
        log.info("bookingSeatIds = {}", seatIds);

        if (seatIds == null || seatIds.isBlank()) {
            log.warn("결제 화면 진입 실패: 선택 좌석 정보 없음");
            return "redirect:/booking/seat";
        }

        BookingResponse.PaymentDTO paymentDTO =
                bookingService.getPaymentInfo(seatIds, sessionUser);

        log.info("결제 화면 DTO 생성 완료");
        log.info("payment.seatCount = {}", paymentDTO.getSeatCount());
        log.info("payment.seatName = {}", paymentDTO.getSeatName());
        log.info("payment.totalPrice = {}", paymentDTO.getTotalPrice());

        model.addAttribute("payment", paymentDTO);

        /*
         * TODO:
         * payment.mustache를 {{payment.totalPriceText}} 같은 방식으로 전부 바꾸면
         * 아래 호환용 model.addAttribute들은 삭제 가능.
         *
         * 지금은 기존 payment.mustache가 {{totalPriceText}}, {{bookingId}}처럼
         * 직접 변수를 찾을 수 있으므로 화면 에러 방지용으로 같이 넘김.
         */
        model.addAttribute("bookingId", paymentDTO.getBookingId());
        model.addAttribute("merchantUid", paymentDTO.getMerchantUid());
        model.addAttribute("seatIds", paymentDTO.getSeatIds());
        model.addAttribute("seatCount", paymentDTO.getSeatCount());
        model.addAttribute("concertTitle", paymentDTO.getConcertTitle());
        model.addAttribute("seatName", paymentDTO.getSeatName());
        model.addAttribute("price", paymentDTO.getPrice());
        model.addAttribute("totalPrice", paymentDTO.getTotalPrice());
        model.addAttribute("totalPriceText", paymentDTO.getTotalPriceText());
        model.addAttribute("ticketPriceText", paymentDTO.getTicketPriceText());
        model.addAttribute("feeText", paymentDTO.getFeeText());
        model.addAttribute("userId", paymentDTO.getUserId());
        model.addAttribute("username", paymentDTO.getUsername());

        return "booking/payment";
    }

    // URL: http://localhost:8080/booking/payment/confirm
// 결제하기 버튼 클릭 시 결제 완료 처리
    @PostMapping("/payment/confirm")
    public String paymentConfirm(HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer sessionId = (Integer) session.getAttribute("bookingSessionId");
        String seatIds = (String) session.getAttribute("bookingSeatIds");

        if (sessionId == null) {
            log.warn("결제 완료 실패: bookingSessionId 없음");
            return "redirect:/booking/seat";
        }

        if (seatIds == null || seatIds.isBlank()) {
            log.warn("결제 완료 실패: bookingSeatIds 없음");
            return "redirect:/booking/seat";
        }

        List<BookingResponse.DetailDTO> bookings =
                bookingService.saveAllConfirmed(sessionId, seatIds, sessionUser);

        if (bookings.isEmpty()) {
            log.warn("결제 완료 실패: 저장된 예매 없음");
            return "redirect:/booking/seat";
        }

        List<Integer> bookingIds = bookings.stream()
                .map(BookingResponse.DetailDTO::getId)
                .toList();

        session.setAttribute("bookingIds", bookingIds);

        // 기존 complete 화면 호환용: 첫 번째 예매 ID 저장
        session.setAttribute("bookingId", bookingIds.get(0));

        log.info("결제 완료 예매 저장 성공");
        log.info("bookingIds = {}", bookingIds);

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

        BookingResponse.CompleteDTO booking = bookingService.findCompleteById(bookingId, sessionUser);

        model.addAttribute("booking", booking);
        model.addAttribute("bookingId", booking.getBookingId());
        model.addAttribute("merchantUid", booking.getBookingNumber());

        model.addAttribute("concertTitle", booking.getConcertTitle());
        model.addAttribute("seatName", booking.getSeatName());
        model.addAttribute("price", booking.getPrice());
        model.addAttribute("totalPriceText", booking.getTotalPriceText());

        model.addAttribute("userId", booking.getUserId());
        model.addAttribute("username", booking.getUsername());

        return "booking/complete";
    }

    private User getSessionUser(HttpSession session) {
        return (User) session.getAttribute(Define.SESSION_USER);
    }
}