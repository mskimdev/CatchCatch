package com.catchcatch.ticket.payment.controller;

import com.catchcatch.ticket.booking.dto.BookingResponse;
import com.catchcatch.ticket.booking.service.BookingService;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.payment.dto.PaymentResponse;
import com.catchcatch.ticket.payment.service.PaymentService;
import com.catchcatch.ticket.user.UserRepository;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

import static com.catchcatch.ticket.core.util.BookingStepUtil.setBookingStep;

@Controller
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;
    private final BookingService bookingService;
    private final UserRepository userRepository;


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


    @GetMapping("/users/payments")
    public String paymentList(
            @RequestParam(value = "keyword", defaultValue = "") String keyword,
            @RequestParam(value = "status", defaultValue = "ALL") String status,
            Model model,
            HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        List<PaymentResponse.ListDTO> payments =
                paymentService.getPaymentList(sessionUser.getId(), keyword, status);

        model.addAttribute("sessionUser", sessionUser);
        model.addAttribute("payments", payments);
        model.addAttribute("paymentCount", payments.size());
        model.addAttribute("navPayments", true);
        model.addAttribute("keyword", keyword);
        model.addAttribute("status", status);
        model.addAttribute("statusAll", "ALL".equals(status));
        model.addAttribute("statusPaid", "PAID".equals(status));
        model.addAttribute("statusReady", "READY".equals(status));
        model.addAttribute("statusCancelled", "CANCELED".equals(status));

        return "payment/payment-list";
    }


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
        model.addAttribute("booking", complete);
        model.addAttribute("pageTitle", "예매 완료");

        return "booking/complete";
    }


    private SessionUser getSessionUser(HttpSession session) {
        return (SessionUser) session.getAttribute(Define.SESSION_USER);
    }

}