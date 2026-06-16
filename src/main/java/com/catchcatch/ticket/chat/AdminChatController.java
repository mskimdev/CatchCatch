package com.catchcatch.ticket.chat;

import com.catchcatch.ticket.chat.dto.ChatMessageResponse;
import com.catchcatch.ticket.core.util.Resp;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Controller
@RequiredArgsConstructor
public class AdminChatController {

    private final ChatService chatService;

    @GetMapping("/admin/chats")
    public String chatList(Model model) {
        model.addAttribute("pageTitle", "채팅 관리");
        model.addAttribute("chatUsers", chatService.getChatUsers());
        return "admin/chat/list";
    }

    @GetMapping("/api/admin/chats/{userId}")
    public ResponseEntity<?> getMessages(@PathVariable Integer userId) {
        return Resp.ok(chatService.getMessages(userId));
    }

} // end of AdminChatController
