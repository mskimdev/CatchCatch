package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.user.User;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Controller
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

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

        User sessionUser = (User) session.getAttribute("sessionUser");

        if (sessionUser == null) {
            return "redirect:/login-form";
        }

        PaymentResponse.FormDTO payment =
                paymentService.getPaymentForm(bookingId, sessionUser.getId());

        model.addAttribute("payment", payment);

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

        User sessionUser = (User) session.getAttribute("sessionUser");

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

        User sessionUser = (User) session.getAttribute("sessionUser");

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

        User sessionUser = (User) session.getAttribute("sessionUser");

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
        User sessionUser = (User) session.getAttribute("sessionUser");

        if (sessionUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "로그인이 필요합니다."));
        }

        PaymentResponse.CompleteDTO responseDTO =
                paymentService.completePayment(sessionUser.getId(), reqDTO);

        return ResponseEntity.ok(responseDTO);
    }
}