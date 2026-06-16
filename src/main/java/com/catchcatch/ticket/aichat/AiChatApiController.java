package com.catchcatch.ticket.aichat;

import com.catchcatch.ticket.core.util.Resp;
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
    public ResponseEntity<?> ask(@RequestBody Map<String, String> body) {
        String answer = aiChatService.ask(body.get("message"));
        return Resp.ok(Map.of("answer", answer));
    }
}