package com.catchcatch.ticket.faq;

import com.catchcatch.ticket.core.exception.BadRequestException;
import lombok.Data;

public class FaqRequest {

    @Data
    public static class SaveDTO {
        private FaqCategory category;
        private String question;
        private String answer;
        private Boolean isVisible;
        private Integer sortOrder;

        public Faq toEntity() {
            return Faq.builder()
                    .category(category)
                    .question(question)
                    .answer(answer)
                    .isVisible(isVisible != null && isVisible)
                    .build();
        }

        public void validate() {
            if (category == null) {
                throw new BadRequestException("FAQ 카테고리를 선택해주세요");
            }

            if (question == null || question.isBlank()) {
                throw new BadRequestException("질문을 입력해주세요");
            }

            if (question.length() > 200) {
                throw new BadRequestException("질문은 200자 이하로 입력해주세요");
            }

            if (answer == null || answer.isBlank()) {
                throw new BadRequestException("답변을 입력해주세요");
            }

            if (sortOrder != null && sortOrder < 0) {
                throw new BadRequestException("정렬 순서는 0 이상이어야 합니다");
            }
        }
    }

    @Data
    public static class UpdateDTO {
        private FaqCategory category;
        private String question;
        private String answer;
        private Boolean isVisible;
        private Integer sortOrder;

        public void validate() {
            if (category == null) {
                throw new BadRequestException("FAQ 카테고리를 선택해주세요");
            }

            if (question == null || question.isBlank()) {
                throw new BadRequestException("질문을 입력해주세요");
            }

            if (question.length() > 200) {
                throw new BadRequestException("질문은 200자 이하로 입력해주세요");
            }

            if (answer == null || answer.isBlank()) {
                throw new BadRequestException("답변을 입력해주세요");
            }

            if (sortOrder != null && sortOrder < 0) {
                throw new BadRequestException("정렬 순서는 0 이상이어야 합니다");
            }
        }
    }
}
