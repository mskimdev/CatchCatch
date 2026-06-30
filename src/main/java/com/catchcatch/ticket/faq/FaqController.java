package com.catchcatch.ticket.faq;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/support/faqs")
public class FaqController {

    private final FaqService faqService;

    @GetMapping
    public String faqList(@RequestParam(required = false) FaqCategory category,
                          @RequestParam(required = false) String keyword,
                          Model model) {

        List<Faq> faqs = faqService.findFaqs(category, keyword);

        model.addAttribute("navFaq", true);
        model.addAttribute("activeQna", true);
        model.addAttribute("pageTitle", "FAQ");
        model.addAttribute("keyword", keyword == null ? "" : keyword);
        model.addAttribute("faqs", faqs);

        addCategoryFlags(model, category);

        return "support/faq";
    }

    private void addCategoryFlags(Model model, FaqCategory category) {
        model.addAttribute("isAll", category == null);
        model.addAttribute("isMember", category == FaqCategory.MEMBER);
        model.addAttribute("isBooking", category == FaqCategory.BOOKING);
        model.addAttribute("isPayment", category == FaqCategory.PAYMENT);
        model.addAttribute("isCancelRefund", category == FaqCategory.CANCEL_REFUND);
        model.addAttribute("isEvent", category == FaqCategory.EVENT);
        model.addAttribute("isService", category == FaqCategory.SERVICE);
    }
}