package com.catchcatch.ticket.notice;

import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin/boards/notice")
public class AdminNoticeController {

    @GetMapping("/")
    public String noticeList(Model model){

        return "admin/board/notice/list";
    }
}
