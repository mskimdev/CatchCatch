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

import static com.catchcatch.ticket.core.util.BookingStepUtil.setBookingStep;
import static com.catchcatch.ticket.seat.QSeat.seat;

@RequiredArgsConstructor
@Controller
@RequestMapping("/booking")
public class BookingController {

    private final BookingService bookingService;


    // 예매 정보 진입
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

        // 예매 단계 유지용 정보 저장
        session.setAttribute("bookingConcertId", req.getConcertId());
        session.setAttribute("bookingSessionId", req.getSessionId());

        return "redirect:/booking/info";
    }

    // 예매 정보
    @GetMapping("/info")
    public String infoForm(Model model, HttpSession session) {
        User sessionUser = getSessionUser(session);

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

        // 예매 프론트 header 변경
        setBookingStep(model, 2);

        return "booking/seat";
    }

    // 좌석 선택 후 결제 화면으로 이동
    // 여기까지만 Booking 담당
    @PostMapping("/payment")
    public String startPayment(
            BookingRequest.SeatSelectDTO req,
            HttpSession session
    ) {
        User sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        req.validate();


        BookingResponse.DetailDTO booking = bookingService.save(new BookingRequest.SaveDTO(
                sessionUser.getId(),
                req.getSessionId(),
                req.getSeatIdList()
        ));

        return "redirect:/booking/" + booking.getId() + "/payment";
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