package com.catchcatch.ticket.notice;

import com.catchcatch.ticket.core.util.HtmlSanitizer;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class NoticeRequest {
    public record SaveDTO(
            String isPinned,

            @NotBlank(message = "제목을 입력해주세요")
            @Size(max = 100, message = "제목은 100자 이하로 입력해주세요")
            String title,

            @NotBlank(message = "내용을 입력해주세요")
            String content
    ) {
        public Notice toEntity() {
            return Notice.builder()
                    .isPinned(isPinned != null && isPinned.equals("true"))
                    .title(title)
                    .content(HtmlSanitizer.sanitize(content))
                    .build();
        }
    }

    public record UpdateDTO(
            Boolean isPinned,

            @NotBlank(message = "제목을 입력해주세요")
            @Size(max = 100, message = "제목은 100자 이하로 입력해주세요")
            String title,

            @NotBlank(message = "내용을 입력해주세요")
            String content
    ) {
        public String sanitizedContent() {
            return HtmlSanitizer.sanitize(content);
        }
    }
}
