package com.catchcatch.ticket.aichat;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequiredArgsConstructor
public class AiChatApiController {

    private final AiChatService aiChatService;

    @PostMapping("/api/chat/ai")
    public ResponseEntity<?> ask(@RequestBody Map<String, String> body, HttpSession session) {
        Integer userId = getSessionUser(session).getId();
        String message = body.get("message");
        String answer = aiChatService.ask(userId, message);
        return Resp.ok(Map.of("answer", answer));
    }

    @PostMapping("/api/chat/ai/reset")
    public ResponseEntity<?> reset(HttpSession session) {
        Integer userId = getSessionUser(session).getId();
        aiChatService.clearHistory(userId);
        return Resp.ok(null);
    }

    private SessionUser getSessionUser(HttpSession session) {
        return (SessionUser) session.getAttribute(Define.SESSION_USER);
    }
}