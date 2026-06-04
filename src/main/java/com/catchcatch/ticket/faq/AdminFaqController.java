//package com.catchcatch.ticket.faq;
//
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Controller;
//import org.springframework.ui.Model;
//import org.springframework.web.bind.annotation.*;
//
//import java.util.List;
//
//@Controller
//@RequiredArgsConstructor
//public class AdminFaqController {
//
//    private final FaqService faqService;
//
//    // 관리자 FAQ 목록 페이지 + 검색
//    @GetMapping("/admin/faqs")
//    public String faqAdminList(@RequestParam(required = false) String keyword,
//                               Model model) {
//
//        List<Faq> faqs = faqService.findAll(keyword);
//
//        boolean isSearch = keyword != null && !keyword.isBlank();
//
//        return "admin/faq-list";
//    }
//
//    // 관리자 FAQ 등록 페이지
//    @GetMapping("/admin/faqs/save")
//    public String faqSaveForm(Model model) {
//
//        return "admin/faq-save";
//    }
//
//    // 관리자 FAQ 등록 처리
//    @PostMapping("/admin/faqs/save")
//    public String faqSaveProc(FaqRequest.SaveDTO dto) {
//        faqService.save(dto);
//        return "redirect:/admin/faqs";
//    }
//
//    // 관리자 FAQ 수정 페이지
//    @GetMapping("/admin/faqs/{id}/edit")
//    public String faqEditForm(@PathVariable Integer id,
//                              Model model) {
//
//        Faq faq = faqService.findById(id);
//
//        return "admin/faq-edit";
//    }
//
//    // 관리자 FAQ 수정 처리
//    @PostMapping("/admin/faqs/{id}/edit")
//    public String faqEditProc(@PathVariable Integer id,
//                              FaqRequest.UpdateDTO dto) {
//
//        faqService.update(id, dto);
//        return "redirect:/admin/faqs";
//    }
//
//    // 관리자 FAQ 삭제 처리
//    @PostMapping("/admin/faqs/{id}/delete")
//    public String faqDeleteProc(@PathVariable Integer id) {
//        faqService.deleteById(id);
//        return "redirect:/admin/faqs";
//    }
//}