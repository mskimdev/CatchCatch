package com.catchcatch.ticket.inquiry;

import com.catchcatch.ticket.inquiry.enums.InquiryCategory;
import com.catchcatch.ticket.user.User;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

public class InquiryRequest {

    public record SaveDTO(
            @NotBlank(message = "카테고리를 선택해주세요")
            InquiryCategory category,
            @NotBlank(message = "제목을 입력해주세요")
            String title,
            @NotBlank(message = "내용을 입력해주세요")
            String content,
            boolean isPublic,
            boolean notifyEmail,
            boolean notifySms
    ){
        public Inquiry toEntity(User user){
            return Inquiry.builder()
                    .title(title)
                    .content(content)
                    .user(user)
                    .category(category)
                    .isPublic(isPublic)
                    .notifyEmail(notifyEmail)
                    .notifySms(notifySms)
                    .build();
        }
    }

    public record ReplyDTO(@NotBlank(message = "답변을 입력해주세요.") String reply) {}
}
