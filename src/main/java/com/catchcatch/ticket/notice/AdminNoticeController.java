package com.catchcatch.ticket.notice;

import com.solapi.shadow.retrofit2.http.Path;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;

import java.util.List;

@Controller
@RequestMapping("/admin/boards/notice")
@RequiredArgsConstructor
public class AdminNoticeController {

    private final NoticeService noticeService;

    @GetMapping
    public String noticeList(Model model){
        model.addAttribute("notices", noticeService.findAll());
        return "admin/board/notice/list";
    }

    @GetMapping("/{id}/edit")
    public String saveForm(@PathVariable Integer id, Model model){
        model.addAttribute("notice", noticeService.findById(id));

        return "admin/board/notice/save";
    }

//    @PostMapping("/{id}/save")
//    public String saveProc(Model model){
//
//    }
}
