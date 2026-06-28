package com.catchcatch.ticket.booking.contoroller;

import com.catchcatch.ticket.booking.dto.BookingRequest;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.booking.service.BookingService;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.queue.QueueService;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.SessionAttribute;

import static com.catchcatch.ticket.core.util.BookingStepUtil.setBookingStep;

@Controller
@RequiredArgsConstructor
@RequestMapping("/booking")
public class BookingController {

    private static final String BOOKING_CONCERT_ID = "bookingConcertId";
    private static final String BOOKING_SESSION_ID = "bookingSessionId";
    private static final String BOOKING_ID = "bookingId";

    private final BookingService bookingService;
    private final QueueService queueService;

    @PostMapping("/start")
    public String start(
            BookingRequest.StartDTO req,
            @SessionAttribute(value = Define.SESSION_USER, required = false) SessionUser sessionUser,
            HttpSession session
    ) {
        if (sessionUser == null) {
            return "redirect:/login";
        }

        req.validate();

        session.setAttribute(BOOKING_CONCERT_ID, req.concertId());
        session.setAttribute(BOOKING_SESSION_ID, req.sessionId());

        return "redirect:/booking/info";
    }

    @GetMapping("/info")
    public String info(
            Model model,
            @SessionAttribute(value = Define.SESSION_USER, required = false) SessionUser sessionUser,
            HttpSession session
    ) {
        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer concertId = getSessionInteger(session, BOOKING_CONCERT_ID);
        Integer sessionId = getSessionInteger(session, BOOKING_SESSION_ID);
        BookingResponse.InfoDTO info = bookingService.getBookingInfo(concertId, sessionId);

        addUserModel(model, sessionUser);
        model.addAttribute("concertId", concertId);
        model.addAttribute("sessionId", sessionId);
        model.addAttribute("concert", info);
        model.addAttribute("pageTitle", "예매 정보");
        model.addAttribute("bookingTitle", "예매 정보");
        model.addAttribute("bookingSubTitle", "공연 정보와 예매자 정보를 확인해주세요.");

        setBookingStep(model, 1);

        return "booking/info";
    }

    @GetMapping("/seat")
    public String seat(
            Model model,
            @SessionAttribute(value = Define.SESSION_USER, required = false) SessionUser sessionUser,
            HttpSession session
    ) {
        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer concertId = getSessionInteger(session, BOOKING_CONCERT_ID);
        Integer sessionId = getSessionInteger(session, BOOKING_SESSION_ID);

        if (!queueService.hasEnteredAccess(sessionId, sessionUser.getId())) {
            return "redirect:/queue/wait?sessionId=" + sessionId;
        }

        BookingResponse.SeatFormDTO seat = bookingService.getSeatForm(sessionId);

        addUserModel(model, sessionUser);
        model.addAttribute("concertId", concertId);
        model.addAttribute("sessionId", sessionId);
        model.addAttribute("seat", seat);
        model.addAttribute("pageTitle", "좌석 선택");
        model.addAttribute("bookingTitle", "좌석 선택");
        model.addAttribute("bookingSubTitle", "좌석을 선택해주세요.");

        setBookingStep(model, 2);

        return "booking/seat";
    }

    @PostMapping("/complete")
    public String save(
            BookingRequest.SeatSelectDTO req,
            @SessionAttribute(value = Define.SESSION_USER, required = false) SessionUser sessionUser,
            HttpSession session
    ) {
        if (sessionUser == null) {
            return "redirect:/login";
        }

        req.validate();

        BookingResponse.DetailDTO booking = bookingService.save(
                sessionUser.getId(),
                new BookingRequest.SaveDTO(req.sessionId(), req.getSeatIdList())
        );

        session.setAttribute(BOOKING_ID, booking.id());

        return "redirect:/booking/complete";
    }

    @GetMapping("/complete")
    public String complete(
            Model model,
            @SessionAttribute(value = Define.SESSION_USER, required = false) SessionUser sessionUser,
            HttpSession session
    ) {
        if (sessionUser == null) {
            return "redirect:/login";
        }

        Integer bookingId = getSessionInteger(session, BOOKING_ID);
        BookingResponse.CompleteDTO complete = bookingService.getComplete(bookingId, sessionUser.getId());

        addUserModel(model, sessionUser);
        model.addAttribute("booking", complete);
        model.addAttribute("pageTitle", "예매 완료");

        return "booking/complete";
    }

    private void addUserModel(Model model, SessionUser sessionUser) {
        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());
    }

    private Integer getSessionInteger(HttpSession session, String name) {
        Object value = session.getAttribute(name);

        if (value instanceof Integer integerValue) {
            return integerValue;
        }

        return null;
    }
}
