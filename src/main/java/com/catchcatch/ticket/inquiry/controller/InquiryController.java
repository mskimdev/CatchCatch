package com.catchcatch.ticket.inquiry.controller;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.inquiry.dto.InquiryRequest;
import com.catchcatch.ticket.inquiry.dto.InquiryResponse;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.catchcatch.ticket.inquiry.service.InquiryService;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
@RequestMapping("/support/inquiries")
public class InquiryController {

    private final InquiryService inquiryService;

    @GetMapping("/new")
    public String inquiryForm(@SessionAttribute(Define.SESSION_USER) SessionUser sessionUser, Model model) {
        model.addAttribute("navInquirySave", true);
        addHasPhone(model, sessionUser);
        return "support/inquiry-save";
    }

    @PostMapping
    public String inquiryProc(@Valid InquiryRequest.SaveDTO req,
                              @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser) {
        inquiryService.save(req, sessionUser.getId());
        return "redirect:/support/inquiries";
    }

    @GetMapping
    public String inquiryList(Model model,
                              @RequestParam(required = false) InquiryStatus status,
                              @RequestParam(defaultValue = "false") boolean publicOnly,
                              @RequestParam(defaultValue = "desc") String sort,
                              @RequestParam(defaultValue = "false") boolean myOnly,
                              @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser) {

        boolean asc = "asc".equals(sort);


        model.addAttribute("navInquiry", true);
        model.addAttribute("inquiries", inquiryService.getList(status, publicOnly, asc, myOnly, sessionUser.getId()));

        model.addAttribute("filterAll", status == null && !myOnly);
        model.addAttribute("filterResolved", InquiryStatus.RESOLVED.equals(status));
        model.addAttribute("filterPublic", publicOnly);
        model.addAttribute("filterMy", myOnly);
        model.addAttribute("sortDesc", !asc);
        model.addAttribute("sortAsc", asc);


        return "support/inquiry-list";
    }

    @GetMapping("/{id}")
    public String inquiryDetail(@PathVariable Integer id, Model model, @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser) {

        InquiryResponse.DetailDTO inquiry = inquiryService.getDetail(id, sessionUser.getId());

        model.addAttribute("navInquiry", true);
        model.addAttribute("inquiry", inquiry);
        return "support/inquiry-detail";
    }

    @GetMapping("/{id}/edit")
    public String inquiryEditForm(
            @PathVariable Integer id,
            Model model,
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser){

        InquiryResponse.DetailDTO inquiry = inquiryService.getDetail(id, sessionUser.getId());
        model.addAttribute("navInquirySave", true);
        model.addAttribute("inquiry", inquiry);
        addHasPhone(model, sessionUser);
        return "support/inquiry-edit";
    }

    private void addHasPhone(Model model, SessionUser sessionUser) {
        model.addAttribute("hasPhone", sessionUser.getPhone() != null && !sessionUser.getPhone().isBlank());
    }
}
