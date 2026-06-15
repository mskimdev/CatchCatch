package com.catchcatch.ticket.chat;

import com.catchcatch.ticket.chat.dto.ChatMessageRequest;
import com.catchcatch.ticket.chat.dto.ChatMessageResponse;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.dto.SessionUser;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessageHeaderAccessor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.Map;

@Controller
@RequiredArgsConstructor
public class ChatController {

    private final SimpMessagingTemplate messagingTemplate;

    private final ChatService chatService;

    @MessageMapping("/chat.send")
    public void send(ChatMessageRequest.SendDTO reqDTO,
                     SimpMessageHeaderAccessor headerAccessor) {

        SessionUser sessionUser = (SessionUser) headerAccessor.getSessionAttributes().get(Define.SESSION_USER);

        if (sessionUser == null)
            throw new BadRequestException("로그인 후 사용해주세요.");

        chatService.send(reqDTO, sessionUser.getId(), sessionUser.getUsername(), "USER");

        messagingTemplate.convertAndSend("/topic/admin.chat",
                Map.of(
                        "userId", sessionUser.getId(),
                        "username", sessionUser.getUsername(),
                        "content", reqDTO.content()
                )
        );
    }

    @MessageMapping("/chat.admin.reply")
    public void adminReply(ChatMessageRequest.ReplyDTO reqDTO,
                           SimpMessageHeaderAccessor headerAccessor) {

        SessionUser sessionUser = (SessionUser) headerAccessor.getSessionAttributes().get(Define.SESSION_USER);

        if(sessionUser == null || !sessionUser.isAdmin())
            throw new BadRequestException("관리자만 사용할 수 있습니다.");

        ChatMessageResponse.MessageDTO resDTO = chatService.send(
                new ChatMessageRequest.SendDTO(reqDTO.content()),
                reqDTO.targetUserId(),
                sessionUser.getUsername(),
                "ADMIN"
        );

        messagingTemplate.convertAndSend(
                "/queue/chat." + reqDTO.targetUserId(),
                 resDTO
        );
    }

}
