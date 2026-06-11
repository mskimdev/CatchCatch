package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.User;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
@RequestMapping("/customercenter/inquires")
public class InquiryController {

    private final InquiryService inquiryService;

    @GetMapping("/save")
    public String inquiryForm(@SessionAttribute(Define.SESSION_USER) User sessionUser, Model model) {
        model.addAttribute("hasPhone", sessionUser != null && sessionUser.getPhone() != null && !sessionUser.getPhone().isBlank());
        return "customercenter/inquiry-save";
    }

    @PostMapping("/save")
    public String inquiryProc(@Valid InquiryRequest.SaveDTO req, @SessionAttribute(Define.SESSION_USER) User sessionUser) {
        // 유효성 검사 (일단 패스)
        inquiryService.save(req, sessionUser);

        return "redirect:/customercenter/inquiries";
    }

    @GetMapping
    public String inquiryList(Model model) {
        model.addAttribute("inquiries", inquiryService.findAll());

        return "customercenter/inquiry-list";
    }

    @GetMapping("/{id}")
    public String inquiryDetail(@PathVariable Integer id, Model model, @SessionAttribute(Define.SESSION_USER) User sessionUser) {
        model.addAttribute("inquiry", inquiryService.findById(id, sessionUser));
        return "customercenter/inquiry-detail";
    }
    
}
