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

    @GetMapping("/admin/boards/inquiry")
    public String inquiryList(@RequestParam(required = false) InquiryStatus status, Model model) {
        model.addAttribute("inquiries", inquiryService.findAllForAdmin(status));
        model.addAttribute("totalCount", inquiryService.findAllForAdmin(null).size());
        model.addAttribute("pendingCount", inquiryService.countPending());
        model.addAttribute("filterAll", status == null);
        model.addAttribute("filterPending", InquiryStatus.PENDING.equals(status));
        model.addAttribute("filterResolved", InquiryStatus.RESOLVED.equals(status));
        return "admin/board/inquiry/list";
    }

    @GetMapping("/admin/boards/inquiry/{id}")
    public String inquiryDetail(@PathVariable Integer id, Model model) {
        model.addAttribute("inquiry", inquiryService.findByIdForAdmin(id));
        return "admin/board/inquiry/detail";
    }

    @PostMapping("/admin/boards/inquiry/{id}/reply")
    public String reply(@PathVariable Integer id, @RequestParam String reply) {
        inquiryService.reply(id, reply);
        return "redirect:/admin/boards/inquiry/" + id;
    }
}