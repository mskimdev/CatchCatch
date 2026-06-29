package com.catchcatch.ticket.booking.contoroller;

import com.catchcatch.ticket.booking.dto.BookingRequest;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.booking.service.BookingService;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.queue.QueueService;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import static com.catchcatch.ticket.core.util.BookingStepUtil.setBookingStep;

@RequiredArgsConstructor
@Controller
@RequestMapping("/booking")
public class BookingController {

    // todo 추후 머스테치에 화면전환 시 이전으로 돌아가면 안되게 설정할 필요가 있음.
    private final BookingService bookingService;
    private final QueueService queueService;

    // 예매 정보 진입
    @PostMapping("/start")
    public String startBooking(
            BookingRequest.StartDTO req,
            HttpSession session
    ) {
        SessionUser sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        req.validate();

        // 예매 단계 유지용 정보 저장
        session.setAttribute("bookingConcertId", req.concertId());
        session.setAttribute("bookingSessionId", req.sessionId());

        return "redirect:/booking/info";
    }

    // 예매 정보
    @GetMapping("/info")
    public String infoForm(Model model, HttpSession session) {
        SessionUser sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer concertId = getSessionInteger(session, "bookingConcertId");
        Integer sessionId = getSessionInteger(session, "bookingSessionId");

        BookingResponse.InfoDTO info = bookingService.findBookingInfo(concertId, sessionId);

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());
        model.addAttribute("concertId", concertId);
        model.addAttribute("sessionId", sessionId);
        model.addAttribute("concert", info); // info.mustache에서 {{#concert}} 로 사용

        model.addAttribute("pageTitle", "예매 정보");
        model.addAttribute("bookingTitle", "예매 정보");
        model.addAttribute("bookingSubTitle", "공연 정보와 예매자 정보를 확인해주세요.");

        // 예매 프론트 header 변경
        setBookingStep(model, 1);

        return "booking/info";
    }

    // 좌석 선택
    @GetMapping("/seat")
    public String seatForm(Model model, HttpSession session) {
        SessionUser sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer concertId = getSessionInteger(session, "bookingConcertId");
        Integer sessionId = getSessionInteger(session, "bookingSessionId");

        if (!queueService.hasEnteredAccess(sessionId, sessionUser.getId())) {
            return "redirect:/queue/wait?sessionId=" + sessionId;
        }

        BookingResponse.SeatFormDTO seat = bookingService.findSeatForm(sessionId);

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());
        model.addAttribute("concertId", concertId);
        model.addAttribute("sessionId", sessionId);
        model.addAttribute("seat", seat);

        model.addAttribute("pageTitle", "좌석 선택");
        model.addAttribute("bookingTitle", "좌석 선택");
        model.addAttribute("bookingSubTitle", "좌석을 선택해주세요.");

        // 예매 프론트 header 변경
        setBookingStep(model, 2);

        return "booking/seat";
    }

    // 좌석 선택 후 예매 저장 -> 결제 화면으로 이동
    @PostMapping("/complete")
    public String startPayment(
            BookingRequest.SeatSelectDTO req,
            HttpSession session
    ) {
        SessionUser sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        req.validate();

        // todo 추후 예매 json 불러 오기 완성 후 연결
//        BookingResponse.DetailDTO booking = bookingService.save(new BookingRequest.SaveDTO(
//                sessionUser.getId(),
//                req.getSessionId(),
//                req.getSeatIdList()
//        ));
//
//        // 완료 화면에서 조회할 예매 ID 저장
//        session.setAttribute("bookingId", booking.getId());
//
//        return "redirect:/booking/payment?bookingId=" + booking.getId();

        return null;
    }

    // 예매 완료
    @GetMapping("/complete")
    public String completeForm(Model model, HttpSession session) {
        SessionUser sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer bookingId = getSessionInteger(session, "bookingId");

        BookingResponse.CompleteDTO complete = bookingService.findCompleteById(bookingId);

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());

        // complete.mustache에서 {{booking.xxx}} 로 사용
        model.addAttribute("booking", complete);

        model.addAttribute("pageTitle", "예매 완료");

        // 완료 화면에서는 예매 단계 헤더 안 쓸 거면 이거 필요 없음
        // setBookingStep(model, 3);

        return "booking/complete";
    }

    // 결제 화면에서 "예약취소"를 눌렀을 때 호출 (결제 전 PENDING 건만 취소 가능)
    @PostMapping("/{id}/cancel")
    @ResponseBody
    public ResponseEntity<?> cancelPendingBooking(@PathVariable Integer id, HttpSession session) {
        SessionUser sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return Resp.fail(HttpStatus.UNAUTHORIZED, "로그인이 필요합니다.");
        }

        bookingService.cancelPendingBooking(id, sessionUser.getId());

        return Resp.ok(null);
    }

    private SessionUser getSessionUser(HttpSession session) {
        return (SessionUser) session.getAttribute(Define.SESSION_USER);
    }

    private Integer getSessionInteger(HttpSession session, String name) {
        Object value = session.getAttribute(name);

        if (value instanceof Integer integerValue) {
            return integerValue;
        }

        return null;
    }
}