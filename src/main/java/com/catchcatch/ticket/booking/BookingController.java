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

        model.addAttribute("pageTitle", "좌석 선택");
        model.addAttribute("bookingTitle", "좌석 선택");
        model.addAttribute("bookingSubTitle", "좌석 선택 후 10분 이내에 결제를 진행해주세요.");

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

        session.setAttribute("bookingSeatIds", req.getSeatIds());

        return "redirect:/booking/payment";
    }

    @GetMapping("/payment")
    public String paymentForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        String seatIds = (String) session.getAttribute("bookingSeatIds");

        if (seatIds == null || seatIds.isBlank()) {
            return "redirect:/booking/seat";
        }

        BookingResponse.PaymentDTO paymentDTO =
                bookingService.getPaymentInfo(seatIds, sessionUser);

        model.addAttribute("payment", paymentDTO);

        model.addAttribute("pageTitle", "결제");
        model.addAttribute("bookingTitle", "결제");
        model.addAttribute("bookingSubTitle", "예매 정보를 확인해주세요.");

        return "booking/payment";
    }

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

        // 결제 완료 시 저장해둔 예매 ID 목록
        List<Integer> bookingIds = getSessionIntegerList(session, "bookingIds");

        if (bookingIds == null || bookingIds.isEmpty()) {
            return "redirect:/";
        }

        // 완료 화면의 대표 예매 정보는 첫 번째 예매 기준으로 표시
        Integer bookingId = bookingIds.get(0);

        BookingResponse.CompleteDTO booking =
                bookingService.findCompleteById(bookingId, sessionUser);

        // 좌석 목록은 기존 결제 화면에서 쓰던 seatIds 기반 PaymentDTO 재사용
        String seatIds = (String) session.getAttribute("bookingSeatIds");

        if (seatIds == null || seatIds.isBlank()) {
            return "redirect:/";
        }

        BookingResponse.PaymentDTO payment =
                bookingService.getPaymentInfo(seatIds, sessionUser);

        model.addAttribute("booking", booking);
        model.addAttribute("payment", payment);

        // 화면에서 총 n석 표시용
        model.addAttribute("bookingCount", bookingIds.size());

        model.addAttribute("pageTitle", "예매 완료");
        model.addAttribute("bookingTitle", "예매 완료");
        model.addAttribute("bookingSubTitle", "예매가 정상적으로 완료되었습니다.");

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

    private List<Integer> getSessionIntegerList(HttpSession session, String name) {
        Object value = session.getAttribute(name);

        if (value instanceof List<?> list) {
            return list.stream()
                    .filter(Integer.class::isInstance)
                    .map(Integer.class::cast)
                    .toList();
        }

        return null;
    }
}