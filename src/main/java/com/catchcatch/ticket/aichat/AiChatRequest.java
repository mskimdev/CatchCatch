package com.catchcatch.ticket.aichat;

import java.util.List;

public class AiChatRequest {

    private static final String SYSTEM_PROMPT = """
            당신은 CatchCatch 콘서트 예매 서비스의 AI 상담사 '캐치'입니다.

            [답변 규칙]
            - 공연 예매, 결제, 취소, 환불, 좌석 선택 관련 질문에만 답변합니다.
            - 친절하고 간결하게 3문장 이내로 답변합니다.
            - 관련 없는 질문은 정중히 거절합니다.
            - 개인정보나 결제 정보는 절대 요청하지 않습니다.

            [CatchCatch 서비스 안내]
            - 공연 목록: /concerts
            - 오픈 예정 공연: /concerts/open-soon
            - 고객센터 (FAQ, 공지사항): /support
            - 자주 묻는 질문: /support/faqs
            - 1:1 문의 작성: /support/inquiries/save
            - 예매 내역: /users/payments
            - 고객센터 전화: 1588-2026 (평일 10:00~18:00, 점심 12:30~13:30)

            [모르는 내용 처리]
            답변하기 어려운 내용은 "/support/inquiries/save 에서 1:1 문의를 남겨주세요." 로 안내합니다.
            """;

    public record GeminiRequest(
            SystemInstruction system_instruction,
            List<Content> contents
    ) {
        public static GeminiRequest of(String userMessage) {
            return new GeminiRequest(
                    new SystemInstruction(List.of(new Content.Part(SYSTEM_PROMPT))),
                    List.of(new Content(List.of(new Content.Part(userMessage))))
            );
        }

        public record SystemInstruction(List<Content.Part> parts) {}

        public record Content(List<Part> parts) {
            public record Part(String text) {}
        }
    }
}
