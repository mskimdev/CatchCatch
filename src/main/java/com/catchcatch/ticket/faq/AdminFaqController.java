package com.catchcatch.ticket.faq;

import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.inquiry.dto.InquiryResponse;
import com.catchcatch.ticket.inquiry.service.InquiryService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
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
    public String faqSave(@Valid FaqRequest.SaveDTO req) {
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

    // 관리자 FAQ 수정 페이지
    @GetMapping("/admin/boards/faq/{id}/edit")
    public String faqEditForm(@PathVariable Integer id, Model model) {
        Faq faq = faqService.findById(id);

        model.addAttribute("pageTitle", "FAQ 수정");
        model.addAttribute("faq", faq);

        model.addAttribute("isMember", faq.getCategory() == FaqCategory.MEMBER);
        model.addAttribute("isBooking", faq.getCategory() == FaqCategory.BOOKING);
        model.addAttribute("isPayment", faq.getCategory() == FaqCategory.PAYMENT);
        model.addAttribute("isCancelRefund", faq.getCategory() == FaqCategory.CANCEL_REFUND);
        model.addAttribute("isEvent", faq.getCategory() == FaqCategory.EVENT);
        model.addAttribute("isService", faq.getCategory() == FaqCategory.SERVICE);


        return "admin/board/faq/edit";
    }

    //faq 삭제 처리
    @DeleteMapping("/api/faqs/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        faqService.deleteById(id);
        return Resp.ok("삭제되었습니다.");
    }

    // FAQ 수정 처리
    @PutMapping("/api/faqs/{id}")
    public ResponseEntity<?> put(@PathVariable Integer id,
                                 @RequestBody FaqRequest.UpdateDTO req) {

        faqService.update(id, req);
        return Resp.ok("수정되었습니다.");
    }
}