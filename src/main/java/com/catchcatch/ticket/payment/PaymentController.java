package com.catchcatch.ticket.payment;

import com.catchcatch.ticket.user.User;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    /**
     * 결제 내역 조회
     * /payments
     */
    @GetMapping("/payments")
    public String paymentList(Model model, HttpSession session) {
        User sessionUser = (User) session.getAttribute("sessionUser");

        if (sessionUser == null) {
            return "redirect:/login-form";
        }

        model.addAttribute("payments", paymentService.getPaymentList(sessionUser.getId()));

        return "payment/payment-list";
    }

    /**
     * 결제 상세내역
     * /payments/{id}
     */
    @GetMapping("/payments/{id}")
    public String paymentDetail(@PathVariable("id") Integer paymentId, Model model, HttpSession session) {

        User sessionUser = (User) session.getAttribute("sessionUser");

        if(sessionUser == null) {
            return "redirect:/login-form";
        }

        model.addAttribute("payment", paymentService.getPaymentDetail(paymentId, sessionUser.getId()));

        return "payment/detail";
    }

}
