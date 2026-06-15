package com.catchcatch.ticket.notice;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
@RequiredArgsConstructor
public class NoticeController {

    private final NoticeService noticeService;

    @GetMapping("/support/notices")
    public String noticeList(Model model){
        model.addAttribute("notices", noticeService.findAll());

        return "support/notice-list";
    }

    @GetMapping("/support/notices/{id}")
    public String noticeDetail(@PathVariable Integer id, Model model){
        model.addAttribute("notice", noticeService.findById(id));

        return "support/notice-detail";
    }
}
