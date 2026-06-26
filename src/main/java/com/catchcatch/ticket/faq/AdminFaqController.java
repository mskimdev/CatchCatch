package com.catchcatch.ticket.faq;

import com.catchcatch.ticket.inquiry.dto.InquiryResponse;
import com.catchcatch.ticket.inquiry.service.InquiryService;
import com.catchcatch.ticket.operationlog.AdminLog;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/boards/faq")
public class AdminFaqController {

    private final FaqService faqService;
    private final InquiryService inquiryService;

    // 관리자 FAQ 목록 페이지 + 검색
    @GetMapping
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
    @AdminLog("FAQ 등록 (#{#req.question})")
    @PostMapping("/save")
    public String faqSave(@Valid FaqRequest.SaveDTO req) {
        faqService.save(req);
        return "redirect:/admin/boards/faq";
    }

    // 관리자 FAQ 등록 페이지
    @GetMapping("/save")
    public String faqSaveForm(@RequestParam(required = false) Integer inquiryId,
                              Model model) {

        model.addAttribute("pageTitle", "FAQ 등록");
        model.addAttribute("question", "");
        model.addAttribute("answer", "");

        if (inquiryId != null) {
            InquiryResponse.AdminDetailDTO inquiry = inquiryService.getAdminDetail(inquiryId);

            model.addAttribute("question", inquiry.title());
            model.addAttribute("answer", inquiry.reply() == null ? "" : inquiry.reply());
        }

        return "admin/board/faq/save";
    }

    // 관리자 FAQ 수정 페이지
    @GetMapping("/{id}/edit")
    public String faqEditForm(@PathVariable Integer id, Model model) {
        Faq faq = faqService.findById(id);

        String answerB64 = Base64.getEncoder().encodeToString(
                faq.getAnswer().getBytes(StandardCharsets.UTF_8)
        );

        model.addAttribute("pageTitle", "FAQ 수정");
        model.addAttribute("faq", faq);
        model.addAttribute("answerB64", answerB64);

        addCategoryFlags(model, faq.getCategory());

        return "admin/board/faq/edit";
    }

    private void addCategoryFlags(Model model, FaqCategory category) {
        model.addAttribute("isMember", category == FaqCategory.MEMBER);
        model.addAttribute("isBooking", category == FaqCategory.BOOKING);
        model.addAttribute("isPayment", category == FaqCategory.PAYMENT);
        model.addAttribute("isCancelRefund", category == FaqCategory.CANCEL_REFUND);
        model.addAttribute("isEvent", category == FaqCategory.EVENT);
        model.addAttribute("isService", category == FaqCategory.SERVICE);
    }
}