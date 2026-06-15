package com.catchcatch.ticket.chat.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class ChatMessageRequest {

    public record SendDTO(
            @NotBlank(message = "메시지를 입력해주세요.")
            String content
    ){}

    public record ReplyDTO(
            @NotNull(message = "대상 유저를 선택해주세요.")
            Integer targetUserId,

            @NotBlank(message = "메시지를 입력해주세요.")
            String content
    ){}
}
