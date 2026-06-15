package com.catchcatch.ticket.faq;

import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.inquiry.dto.InquiryResponse;
import com.catchcatch.ticket.inquiry.service.InquiryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Controller
@RequiredArgsConstructor
public class AdminFaqController {

    private final FaqService faqService;
    private final InquiryService inquiryService;

    // 관리자 FAQ 목록 페이지 + 검색
    @GetMapping("/admin/boards/faq")
    public String faqList(@RequestParam(required = false) String keyword,
                          Model model) {

        List<Faq> faqs = faqService.findAll(keyword);

        boolean isSearch = keyword != null && !keyword.isBlank();

        model.addAttribute("pageTitle", "FAQ 관리");
        model.addAttribute("faqs", faqs);
        model.addAttribute("faqCount", faqs.size());

        model.addAttribute("keyword", isSearch ? keyword : "");
        model.addAttribute("isSearch", isSearch);

        return "admin/board/faq/list";
    }


    // 관리자 FAQ 등록 처리
    @PostMapping("/admin/boards/faq/save")
    public String faqSave(FaqRequest.SaveDTO req) {
        faqService.save(req);
        return "redirect:/admin/boards/faq";
    }

    // 관리자 FAQ 등록 페이지
    @GetMapping("/admin/boards/faq/save")
    public String faqSaveForm(@RequestParam(required = false) Integer inquiryId,
                              Model model) {

        model.addAttribute("pageTitle", "FAQ 등록");

        model.addAttribute("question", "");
        model.addAttribute("answer", "");

        if (inquiryId != null) {
            InquiryResponse.AdminDetailDTO inquiry = inquiryService.findByIdForAdmin(inquiryId);

            model.addAttribute("question", inquiry.title());
            model.addAttribute("answer", inquiry.reply() == null ? "" : inquiry.reply());
        }

        return "admin/board/faq/save";
    }
}