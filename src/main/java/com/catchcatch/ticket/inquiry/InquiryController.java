package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.core.exception.ForbiddenException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.inquiry.enums.InquiryStatus;
import com.catchcatch.ticket.user.User;
import jakarta.servlet.http.HttpSession;
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

    @GetMapping("/save")
    public String inquiryForm(@SessionAttribute(Define.SESSION_USER) User sessionUser, Model model) {
        model.addAttribute("hasPhone", sessionUser != null &&
                sessionUser.getPhone() != null &&
                !sessionUser.getPhone().isBlank());
        return "support/inquiry-save";
    }

    @PostMapping("/save")
    public String inquiryProc(@Valid InquiryRequest.SaveDTO req,
                              HttpSession session) {
        // 유효성 검사 (일단 패스)
        inquiryService.save(req, (User) session.getAttribute(Define.SESSION_USER));

        return "redirect:/support/inquiries";
    }

    @GetMapping
    public String inquiryList(Model model,
                              @RequestParam(required = false) InquiryStatus status,
                              @RequestParam(defaultValue = "false") boolean publicOnly,
                              @RequestParam(defaultValue = "desc") String sort,
                              @RequestParam(defaultValue = "false") boolean myOnly,
                              @SessionAttribute(Define.SESSION_USER) User sessionUser) {

        boolean asc = "asc".equals(sort);


        model.addAttribute("inquiries", inquiryService.findAllByFilter(status, publicOnly, asc, myOnly, sessionUser.getId()));

        model.addAttribute("filterAll", status == null && !myOnly);
        model.addAttribute("filterResolved", InquiryStatus.RESOLVED.equals(status));
        model.addAttribute("filterPublic", publicOnly);
        model.addAttribute("filterMy", myOnly);
        model.addAttribute("sortDesc", !asc);
        model.addAttribute("sortAsc", asc);


        return "support/inquiry-list";
    }

    @GetMapping("/{id}")
    public String inquiryDetail(@PathVariable Integer id, Model model, @SessionAttribute(Define.SESSION_USER) User sessionUser) {

        InquiryResponse.DetailDTO inquiry = inquiryService.findById(id, sessionUser.getId());


        model.addAttribute("inquiry", inquiry);
        return "support/inquiry-detail";
    }

    @GetMapping("/{id}/edit")
    public String inquiryEditForm(
            @PathVariable Integer id, Model model,
            @SessionAttribute(Define.SESSION_USER) User sessionUser
    ){
        InquiryResponse.DetailDTO inquiry = inquiryService.findById(id, sessionUser.getId());
        if(!inquiry.isOwner()){
            throw new ForbiddenException("수정 권한이 없습니다.(본인 게시글 아님");
        }

        model.addAttribute("hasPhone", sessionUser.getPhone() != null && !sessionUser.getPhone().isBlank());
        model.addAttribute("inquiry", inquiry);

        return "support/inquiry-edit";
    }

}
