package com.catchcatch.ticket.notice;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.systemlog.AdminLog;
import com.catchcatch.ticket.user.dto.SessionUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

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

    @AdminLog("공지사항 등록 (#{#reqDTO.title})")
    @PostMapping("/save")
    public String saveProc(NoticeRequest.SaveDTO reqDTO,
                           @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser) {
        noticeService.save(reqDTO, sessionUser.getId());

        return "redirect:/admin/boards/notice";
    }

    @AdminLog("공지사항 수정 (id=#{#id})")
    @PutMapping("/{id}/edit")
    public ResponseEntity<?> update(@PathVariable Integer id,
                                    @RequestBody NoticeRequest.UpdateDTO reqDTO,
                                    @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser) {

        noticeService.update(id, reqDTO, sessionUser.getId());
        return Resp.ok("수정되었습니다.");
    }

    @GetMapping("/{id}/edit")
    public String updateForm(Model model, @PathVariable Integer id) {

        model.addAttribute("pageTitle", "공지사항 수정");
        model.addAttribute("notice", noticeService.findById(id));
        return "admin/board/notice/edit";
    }

    @AdminLog("공지사항 삭제 (id=#{#id})")
    @PostMapping("/{id}/delete")
    public String deleteProc(@PathVariable Integer id) {
        noticeService.deleteById(id);
        return "redirect:/admin/boards/notice";
    }

    @AdminLog("공지사항 삭제 (id=#{#id})")
    @DeleteMapping("/api/notices/{id}")
    public ResponseEntity<?> delete(@PathVariable Integer id) {
        noticeService.deleteById(id);

        return Resp.ok("삭제되었습니다.");
    }

    @GetMapping("/api/notices/{id}")
    public String deleteFrom(Model model, @PathVariable Integer id) {
        model.addAttribute("pageTitle", "공지사항 삭제");
        model.addAttribute("notice", noticeService.findById(id));
        return "admin/board/notice/edit";
    }
}
