package com.catchcatch.ticket.inquiry.dto;

import com.catchcatch.ticket.inquiry.Inquiry;
import com.catchcatch.ticket.inquiry.enums.InquiryCategory;
import com.catchcatch.ticket.user.User;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public class InquiryRequest {

    public record SaveDTO(
            @NotNull(message = "카테고리를 선택해주세요.")
            InquiryCategory category,
            @NotBlank(message = "제목을 입력해주세요")
            String title,
            @NotBlank(message = "내용을 입력해주세요")
            String content,
            Boolean isPublic,
            Boolean notifyEmail,
            Boolean notifySms
    ){
        public Inquiry toEntity(User user){
            return Inquiry.builder()
                    .title(title)
                    .content(content)
                    .user(user)
                    .category(category)
                    .isPublic(Boolean.TRUE.equals(isPublic))
                    .notifyEmail(Boolean.TRUE.equals(notifyEmail))
                    .notifySms(Boolean.TRUE.equals(notifySms))
                    .build();
        }
    }

    public record EditDTO(
            @NotNull(message = "카테고리를 선택해주세요.")
            InquiryCategory category,
            @NotBlank(message = "제목을 입력해주세요")
            String title,
            @NotBlank(message = "내용을 입력해주세요")
            String content,
            Boolean isPublic,
            Boolean notifyEmail,
            Boolean notifySms
    ) {}

    public record ReplyDTO(@NotBlank(message = "답변을 입력해주세요.") String reply) {}
}
