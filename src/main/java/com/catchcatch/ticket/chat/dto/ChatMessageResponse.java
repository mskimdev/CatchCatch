package com.catchcatch.ticket.chat.dto;

import com.catchcatch.ticket.chat.ChatMessage;
import com.catchcatch.ticket.core.util.DateUtil;

public class ChatMessageResponse {

    public record MessageDTO(
            Long id,
            String username,
            String senderRole,
            String content,
            String createdAt
    ) {
        public MessageDTO(ChatMessage chatMessage) {
            this(
                    chatMessage.getId(),
                    chatMessage.getUsername(),
                    chatMessage.getSenderRole(),
                    chatMessage.getContent(),
                    DateUtil.formatDateTime(chatMessage.getCreatedAt())
            );
        }
    }

    public record ChatUserDTO(
            Long userId,
            String username,
            String lastMessage,
            String createdAt
    ) {
        public ChatUserDTO(ChatMessage chatMessage) {
            this(
                    chatMessage.getRoomId(),
                    chatMessage.getUsername(),
                    chatMessage.getContent(),
                    DateUtil.formatDateTime(chatMessage.getCreatedAt())
            );
        }
    }

}
