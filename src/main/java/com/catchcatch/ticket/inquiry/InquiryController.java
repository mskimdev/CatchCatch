package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.User;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;

@Controller
@RequiredArgsConstructor
public class InquiryController {

    private final InquiryService inquiryService;

    @GetMapping("/customercenter/inquiries/save")
    public String inquiryForm(HttpSession session, Model model) {
        User user = (User)session.getAttribute(Define.SESSION_USER);
        model.addAttribute("hasPhone", user != null && user.getPhone() != null && !user.getPhone().isBlank());
        return "customercenter/inquiry-save";
    }

    @PostMapping("/customercenter/inquiries/save")
    public String inquiryProc(InquiryRequest.SaveDTO req, HttpSession session) {
        // 유효성 검사 (일단 패스)
        inquiryService.save(req, (User)session.getAttribute(Define.SESSION_USER));

        return "redirect:/customercenter/inquiries";
    }

    @GetMapping("/customercenter/inquiries")
    public String inquiryList(Model model) {
        model.addAttribute("inquiries", inquiryService.findAll());

        return "customercenter/inquiry-list";
    }
    
}
