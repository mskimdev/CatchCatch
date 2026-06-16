package com.catchcatch.ticket.faq;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public class FaqRequest {

    public record SaveDTO(
            @NotNull(message = "FAQ 카테고리를 선택해주세요")
            FaqCategory category,

            @NotBlank(message = "질문을 입력해주세요")
            @Size(max = 200, message = "질문은 200자 이하로 입력해주세요")
            String question,

            @NotBlank(message = "답변을 입력해주세요")
            String answer
    ) {
        public Faq toEntity() {
            return Faq.builder()
                    .category(category)
                    .question(question)
                    .answer(answer)
                    .build();
        }
    }

    public record UpdateDTO(
            @NotNull(message = "FAQ 카테고리를 선택해주세요")
            FaqCategory category,

            @NotBlank(message = "질문을 입력해주세요")
            @Size(max = 200, message = "질문은 200자 이하로 입력해주세요")
            String question,

            @NotBlank(message = "답변을 입력해주세요")
            String answer
    ) {
    }
}