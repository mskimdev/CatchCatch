package com.catchcatch.ticket.chat;

import com.catchcatch.ticket.chat.dto.ChatMessageRequest;
import com.catchcatch.ticket.chat.dto.ChatMessageResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    private final ChatRepository chatRepository;

    @Transactional
    public ChatMessageResponse.MessageDTO send(ChatMessageRequest.SendDTO reqDTO, Integer userId, String username, String senderRole) {
        ChatMessage chatMessage = ChatMessage.builder()
                .roomId(userId.longValue())
                .username(username)
                .senderRole(senderRole)
                .content(reqDTO.content())
                .build();

        chatRepository.save(chatMessage);
        return new ChatMessageResponse.MessageDTO(chatMessage);
    }

    public List<ChatMessageResponse.MessageDTO> getMessages(Integer userId) {
        return chatRepository.findByRoomIdOrderByCreatedAtAsc(userId.longValue()).stream()
                .map(ChatMessageResponse.MessageDTO::new)
                .toList();
    }

    public List<ChatMessageResponse.ChatUserDTO> getChatUsers() {
        return chatRepository.findLastMessagePerRoom().stream()
                .map(ChatMessageResponse.ChatUserDTO::new)
                .toList();
    }

}
