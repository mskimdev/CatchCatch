package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequiredArgsConstructor
public class InquiryAdminController {

    private final InquiryService inquiryService;

    @GetMapping("/admin/inquiries")
    public String inquiryList(@RequestParam(required = false) InquiryStatus status, Model model) {
        model.addAttribute("inquiries", inquiryService.findAllForAdmin(status));
        model.addAttribute("totalCount", inquiryService.findAllForAdmin(null).size());
        model.addAttribute("pendingCount", inquiryService.countPending());
        model.addAttribute("filterAll", status == null);
        model.addAttribute("filterPending", InquiryStatus.PENDING.equals(status));
        model.addAttribute("filterResolved", InquiryStatus.RESOLVED.equals(status));
        model.addAttribute("activeInquiry", true);
        return "admin/inquiry-list";
    }

    @GetMapping("/admin/inquiries/{id}")
    public String inquiryDetail(@PathVariable Integer id, Model model) {
        model.addAttribute("inquiry", inquiryService.findByIdForAdmin(id));
        model.addAttribute("activeInquiry", true);
        return "admin/inquiry-detail";
    }

    @PostMapping("/admin/inquiries/{id}/reply")
    public String reply(@PathVariable Integer id, @RequestParam String reply) {
        inquiryService.reply(id, reply);
        return "redirect:/admin/inquiries/" + id;
    }
}