package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.booking.BookingService;
import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

import static com.catchcatch.ticket.core.util.BookingStepUtil.setBookingStep;

@Controller
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final BookingService bookingService;
    private final UserRepository userRepository;

    /**
     * 결제 진행 화면
     *
     * 예:
     * GET /booking/payment?bookingId=1
     */
    @GetMapping("/booking/payment")
    public String paymentForm(@RequestParam("bookingId") Integer bookingId,
                              Model model,
                              HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return "redirect:/login-form";
        }

        PaymentResponse.FormDTO payment =
                paymentService.getPaymentForm(bookingId, sessionUser.getId());

        model.addAttribute("payment", payment);
        model.addAttribute("pageTitle", "결제");
        setBookingStep(model, 3);

        return "payment/payment-form";
    }
    /**
     * 내 결제 내역 목록
     * <p>
     * 예:
     * GET /payments
     */
    @GetMapping("/users/payments")
    public String paymentList(Model model, HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        List<PaymentResponse.ListDTO> payments = paymentService.getPaymentList(sessionUser.getId());
        model.addAttribute("payments", payments);
        model.addAttribute("paymentCount", payments.size());
        // 사이드바 결제 내역 활성화
        model.addAttribute("navPayments", true);

        return "payment/payment-list";
    }

    /**
     * 결제 상세내역
     * <p>
     * 예:
     * GET /payments/1
     */
    @GetMapping("/users/payments/{id}")
    public String paymentDetail(@PathVariable("id") Integer paymentId,
                                Model model,
                                HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return "redirect:/login-form";
        }

        model.addAttribute("payment", paymentService.getPaymentDetail(paymentId, sessionUser.getId()));

        return "payment/payment-detail";
    }

    /**
     * 결제 준비 API
     * <p>
     * 예:
     * POST /api/payments/prepare
     * <p>
     * 요청 예시:
     * {
     * "bookingId": 1,
     * "method": "card"
     * }
     */
    @PostMapping("/api/payments/prepare")
    @ResponseBody
    public ResponseEntity<?> preparePayment(@RequestBody PaymentRequest.PrepareDTO reqDTO, HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "로그인이 필요합니다."));
        }

        PaymentResponse.PrepareDTO responseDTO =
                paymentService.preparePayment(sessionUser.getId(), reqDTO);

        return ResponseEntity.ok(responseDTO);
    }

    /**
     * 결제 완료 API
     * <p>
     * 포트원 결제 성공 후 프론트에서 호출.
     * <p>
     * 예:
     * POST /api/payments/complete
     * <p>
     * 요청 예시:
     * {
     * "paymentId": "catchcatch_1_1717481234567_a1b2c3d4"
     * }
     */
    @PostMapping("/api/payments/complete")
    @ResponseBody
    public ResponseEntity<?> completePayment(
            @RequestBody PaymentRequest.CompleteDTO reqDTO,
            HttpSession session
    ) {
        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "로그인이 필요합니다."));
        }

        PaymentResponse.CompleteDTO responseDTO =
                paymentService.completePayment(sessionUser.getId(), reqDTO);

        // 최신 User 조회
        User user = userRepository.findById(sessionUser.getId())
                .orElseThrow();
        // 세션 갱신
        session.setAttribute(
                Define.SESSION_USER,
                new SessionUser(user)
        );

        return ResponseEntity.ok(responseDTO);
    }


    // 결제 완료 후 예약 확정 화면
    @GetMapping("/payment/complete")
    public String completePaymentForm(@RequestParam("paymentId") String paymentId,
                               Model model, HttpSession session) {
        SessionUser sessionUser = getSessionUser(session);

        if (sessionUser == null) {
            return "redirect:/login";
        }


        BookingResponse.CompleteDTO complete = bookingService.findCompleteByPaymentId(paymentId);

        model.addAttribute("userId", sessionUser.getId());
        model.addAttribute("username", sessionUser.getUsername());

        // complete.mustache에서 {{booking.xxx}} 로 사용
        model.addAttribute("booking", complete);

        model.addAttribute("pageTitle", "예매 완료");

        // 완료 화면에서는 예매 단계 헤더 안 쓸 거면 이거 필요 없음
        // setBookingStep(model, 3);

        return "booking/complete";
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