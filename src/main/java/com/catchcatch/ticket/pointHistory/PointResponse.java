package com.catchcatch.ticket.pointHistory;

import com.catchcatch.ticket.core.util.DateUtil;

public class PointResponse {

    /**
     * 1. 당월 포인트 이용 내역 조회용 DTO (메인 마이페이지용)
     */
    public record ListDTO(
            Integer id,
            String typeLabel,    // "적립" | "사용" | "만료"
            Integer amount,      // +500, -1000 등의 변동 금액
            String title,        // "출석 체크 이벤트" 또는 "티켓 예매 결제" 등
            String createdAt     // 발생 일자 (YYYY-MM-DD HH:mm)
    ) {
        public ListDTO(PointHistory pointHistory) {
            this(
                    pointHistory.getId(),
                    getTypeLabel(pointHistory.getType()),
                    pointHistory.getAmount(),
                    getHistoryTitle(pointHistory),
                    DateUtil.format(pointHistory.getCreatedAt())
            );
        }

        // 포인트 타입에 따른 직관적인 한글 라벨 생성
        private static String getTypeLabel(PointHistoryType type) {
            if (type == null) return "기타";
            return switch (type) {
                case EARN -> "적립";
                case USE -> "사용";
                case EXPIRE -> "만료";
                case REFUND -> "반환";
            };
        }

        // 적립 출처나 사용처에 따른 직관적인 제목 생성
        private static String getHistoryTitle(PointHistory pointHistory) {
            if (pointHistory.getEventHistory() != null && pointHistory.getEventHistory().getEvent() != null) {
                return pointHistory.getEventHistory().getEvent().getTitle(); // 이벤트 명
            }
            if (pointHistory.getPayment() != null) {
                return "콘서트 티켓 예매 결제"; // 결제 건
            }
            return "시스템 포인트 조정";
        }
    }

    /**
     * 2. 30일 내 만료 예정 포인트 조회용 DTO (중앙 작은 모달창/새 창용)
     */
    public record ExpiringDTO(
            Integer id,
            String title,        // 소멸 예정인 포인트가 처음에 적립되었던 건의 이름
            Integer balance,     // 만료될 예정인 잔여 포인트 (amount가 아니라 남은 잔액인 balance)
            String expiredAt     // 만료 예정 일시
    ) {
        public ExpiringDTO(PointHistory pointHistory) {
            this(
                    pointHistory.getId(),
                    getHistoryTitle(pointHistory),
                    pointHistory.getBalance(), // 🔒 포인트 적립 기록 중 아직 쓰지 않고 남아있는 잔액
                    DateUtil.format(pointHistory.getExpiredAt())
            );
        }

        private static String getHistoryTitle(PointHistory pointHistory) {
            if (pointHistory.getEventHistory() != null && pointHistory.getEventHistory().getEvent() != null) {
                return pointHistory.getEventHistory().getEvent().getTitle() + " (적립분)";
            }
            return "이벤트 참여 적립 포인트";
        }
    }
}
