package com.catchcatch.ticket.faq;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class FaqController {

    private final FaqService faqService;

    @GetMapping("/customercenter/faqs")
    public String faqList(@RequestParam(required = false) FaqCategory category,
                          @RequestParam(required = false) String keyword,
                          Model model) {

        List<Faq> faqs = faqService.findVisibleFaqs(category, keyword);

        model.addAttribute("pageTitle", "FAQ");
        model.addAttribute("keyword", keyword == null ? "" : keyword);
        model.addAttribute("faqs", faqs);

        // 탭 active 처리
        model.addAttribute("isAll", category == null);
        model.addAttribute("isMember", category == FaqCategory.MEMBER);
        model.addAttribute("isBooking", category == FaqCategory.BOOKING);
        model.addAttribute("isPayment", category == FaqCategory.PAYMENT);
        model.addAttribute("isCancelRefund", category == FaqCategory.CANCEL_REFUND);
        model.addAttribute("isEvent", category == FaqCategory.EVENT);
        model.addAttribute("isService", category == FaqCategory.SERVICE);

        return "customercenter/faq";
    }
}