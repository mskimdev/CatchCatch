package com.catchcatch.ticket.inquiry.controller;

import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.catchcatch.ticket.inquiry.service.InquiryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/boards/inquiry")
public class AdminInquiryController {

    private final InquiryService inquiryService;

    @GetMapping
    public String inquiryList(@RequestParam(required = false) InquiryStatus status, Model model) {
        var inquiries = inquiryService.getAdminList(status);
        var total = status == null ? inquiries.size() : inquiryService.getAdminList(null).size();

        model.addAttribute("inquiries", inquiries);
        model.addAttribute("totalCount", total);
        model.addAttribute("pendingCount", inquiryService.countPending());
        model.addAttribute("filterAll", status == null);
        model.addAttribute("filterPending", InquiryStatus.PENDING.equals(status));
        model.addAttribute("filterResolved", InquiryStatus.RESOLVED.equals(status));
        return "admin/board/inquiry/list";
    }

    @GetMapping("/{id}")
    public String inquiryDetail(@PathVariable Integer id, Model model) {
        model.addAttribute("inquiry", inquiryService.getAdminDetail(id));
        return "admin/board/inquiry/detail";
    }
}