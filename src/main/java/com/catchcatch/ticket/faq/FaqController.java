package com.catchcatch.ticket.faq;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class FaqController {

    private final FaqService faqService;

    @GetMapping("/customercenter/faqs")
    public String faqList(String keyword, Model model) {
        List<Faq> faqs = faqService.findVisibleFaqs();

        model.addAttribute("pageTitle", "고객센터");
        model.addAttribute("keyword", keyword == null ? "" : keyword);
        model.addAttribute("faqs", faqs);
        model.addAttribute("categories", FaqCategory.values());

        return "customercenter/faq";
    }
}