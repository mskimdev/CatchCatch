package com.catchcatch.ticket.booking;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequestMapping("/booking")
public class BookingController {

    // URL: http://localhost:8080/booking/seat
    // 좌석 선택 화면으로 이동
    @GetMapping("/seat")
    public String seatForm() {
        return "booking/seat";
    }

    // URL: http://localhost:8080/booking/payment
    // 결제 화면으로 이동
    @GetMapping("/payment")
    public String paymentForm(Model model) {
        model.addAttribute("bookingId", 1);
        model.addAttribute("merchantUid", "ORDER-" + System.currentTimeMillis());

        model.addAttribute("concertTitle", "테스트 콘서트");
        model.addAttribute("seatName", "A-1");
        model.addAttribute("price", 50000);

        model.addAttribute("totalPrice", 308000);
        model.addAttribute("totalPriceText", "308,000원");
        model.addAttribute("ticketPriceText", "308,000원");
        model.addAttribute("feeText", "0원");

        return "booking/payment";
    }

    // URL: http://localhost:8080/booking/payment/confirm
    // 결제하기 버튼 클릭 시 결제 요청 처리
    @PostMapping("/payment/confirm")
    public String paymentConfirm(
            @RequestParam Integer bookingId,
            @RequestParam String merchantUid,
            @RequestParam Integer amount,
            @RequestParam String method
    ) {
        // TODO: 결제 검증 및 결제 상태 저장 처리
        // bookingId: 예매 ID
        // merchantUid: 주문 번호
        // amount: 결제 금액
        // method: 결제 수단

        return "redirect:/booking/complete";
    }

    // URL: http://localhost:8080/booking/complete
    // 예매 완료 화면으로 이동
    @GetMapping("/complete")
    public String completeForm(Model model) {
        model.addAttribute("bookingId", 1);
        model.addAttribute("merchantUid", "ORDER-TEST-001");
        model.addAttribute("concertTitle", "테스트 콘서트");
        model.addAttribute("seatName", "A-1");
        model.addAttribute("price", 50000);
        model.addAttribute("totalPriceText", "308,000원");

        return "booking/complete";
    }
}