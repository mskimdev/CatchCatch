package com.catchcatch.ticket.aichat;

import lombok.RequiredArgsConstructor;
import org.springframework.ai.anthropic.AnthropicChatModel;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.ai.chat.messages.AssistantMessage;
import org.springframework.ai.chat.messages.Message;
import org.springframework.ai.chat.messages.UserMessage;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AiChatService {

    private final AnthropicChatModel chatModel;
    private final AiChatTools aiChatTools;

    // sessionId → 대화 히스토리 (서버 메모리, 최대 20턴 유지)
    private final Map<String, List<Message>> historyStore = new ConcurrentHashMap<>();
    private static final int MAX_HISTORY = 20;

    private static final String CATCH_PROMPT = """
            당신은 CatchCatch 콘서트 예매 서비스의 AI 상담사 '캐치'입니다.

            [말투]
            - 친절하고 간결하게 답변합니다.
            - 존댓말을 사용하되 딱딱하지 않게 합니다.
            - 이모지는 사용하지 않습니다.
            - 불필요한 인사말이나 맺음말 없이 바로 핵심을 답합니다.

            [답변 범위]
            - 공연 예매, 결제, 취소, 환불, 좌석 선택에 관한 질문만 답변합니다.
            - 범위 밖의 질문은 "해당 내용은 안내드리기 어렵습니다. 다른 예매 관련 문의가 있으시면 말씀해 주세요." 라고 답합니다.
            - 개인정보나 결제 정보는 절대 요청하지 않습니다.

            [CatchCatch 서비스 정책]
            - 취소/환불: 공연 7일 전까지 전액 환불, 3~6일 전 70% 환불, 1~2일 전 50% 환불, 당일 환불 불가
            - 좌석 선택: 예매 시 좌석 선택 가능, 선택 후 10분 이내 결제 완료 필요
            - 결제 수단: 신용카드, 카카오페이, 토스페이, 가상계좌 지원
            - 예매 취소는 마이페이지 예매 내역에서 직접 가능

            [페이지 안내]
            - 공연 목록: [공연 보러가기](/concerts)
            - 오픈 예정 공연: [오픈 예정 공연](/concerts/open-soon)
            - 고객센터: [고객센터 바로가기](/support)
            - 자주 묻는 질문: [FAQ 바로가기](/support/faqs)
            - 1:1 문의: [1:1 문의하기](/support/inquiries/save)
            - 예매 내역: [예매 내역 확인](/users/payments)
            - 고객센터 전화: 1588-2026 (평일 10:00~18:00, 점심 12:30~13:30)

            [링크 규칙]
            - 페이지를 안내할 때는 반드시 마크다운 링크 형식 [텍스트](URL) 을 사용합니다.
            - URL은 절대 그대로 노출하지 않습니다.

            [대화 흐름]
            - 공연명이나 아티스트명이 불명확하면 "어떤 공연을 말씀하시는 건가요?" 라고 되물어 확인합니다.
            - 검색 결과가 여러 개면 목록을 보여주고 "어떤 공연을 원하시나요?" 라고 선택을 유도합니다.
            - 이전 대화 맥락을 기억하고 활용합니다. 예: 앞서 언급한 공연에 대한 추가 질문이면 다시 묻지 않습니다.
            - 회차가 여러 개면 목록을 보여주고 원하는 회차를 선택하게 합니다.

            [모르는 내용 처리]
            정확히 알 수 없는 내용은 [1:1 문의하기](/support/inquiries/save) 로 안내합니다.
            """;

    public String ask(String sessionId, String message) {
        List<Message> history = historyStore.computeIfAbsent(sessionId, k -> new ArrayList<>());

        history.add(new UserMessage(message));

        String answer = ChatClient.builder(chatModel)
                .build()
                .prompt()
                .system(CATCH_PROMPT)
                .messages(history)
                .tools(aiChatTools)
                .call()
                .content();

        history.add(new AssistantMessage(answer));

        // 최대 턴 수 초과 시 오래된 것부터 제거 (앞에서 2개씩 = user+assistant 1쌍)
        while (history.size() > MAX_HISTORY) {
            history.remove(0);
            history.remove(0);
        }

        return answer;
    }

    public void clearHistory(String sessionId) {
        historyStore.remove(sessionId);
    }
}