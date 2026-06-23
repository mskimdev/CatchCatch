package com.catchcatch.ticket.queue;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequiredArgsConstructor
public class QueueController {

    private final QueueService queueService;

    @GetMapping("/queue/wait")
    public String waitPage(@RequestParam Integer sessionId, Model model, HttpSession session) {
        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return "redirect:/login";
        }

        // 이미 입장 처리됐다면 대기열 화면을 보여줄 필요 없이 좌석 화면으로 바로 보낸다.
        if (queueService.hasEnteredAccess(sessionId, sessionUser.getId())) {
            return "redirect:/booking/seat";
        }

        queueService.enter(sessionId, sessionUser.getId());

        model.addAttribute("pageTitle", "대기열");
        model.addAttribute("sessionId", sessionId);

        return "queue/wait";
    }
}