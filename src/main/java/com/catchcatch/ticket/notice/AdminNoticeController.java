package com.catchcatch.ticket.notice;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.dto.SessionUser;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.SessionAttribute;

import java.util.List;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/boards/notice")
public class AdminNoticeController {

    private final NoticeService noticeService;

    @GetMapping({"", "/"})
    public String noticeList(Model model) {
        List<NoticeResponse.ListDTO> notices = noticeService.findAll();

        model.addAttribute("pageTitle", "공지사항 관리");
        model.addAttribute("notices", notices);
        model.addAttribute("totalCount", notices.size());
        model.addAttribute("pinnedCount", notices.stream().filter(NoticeResponse.ListDTO::isPinned).count());

        return "admin/board/notice/list";
    }

    @GetMapping("/save")
    public String saveForm(Model model) {

        return "admin/board/notice/save";
    }

    @PostMapping("/save")
    public String saveProc(NoticeRequest.SaveDTO reqDTO,
                           @SessionAttribute(Define.SESSION_USER)SessionUser sessionUser) {
        noticeService.save(reqDTO, sessionUser.getId());

        return "redirect:/admin/boards/notice";
    }
}
