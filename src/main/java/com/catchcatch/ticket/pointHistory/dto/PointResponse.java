package com.catchcatch.ticket.pointHistory.dto;

import com.catchcatch.ticket.core.util.DateUtil;
import com.catchcatch.ticket.pointHistory.PointHistory;
import com.catchcatch.ticket.pointHistory.enums.PointHistoryType;

public class PointResponse {

    public record ListDTO(
            Integer id,
            String typeLabel,    // "적립" | "사용" | "만료"
            Integer amount,      // 변동 금액
            String title,        // "출석 체크 이벤트" 또는 "티켓 예매 결제" 등
            String createdAt
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

        private static String getTypeLabel(PointHistoryType type) {
            if (type == null) return "기타";
            return switch (type) {
                case EARN -> "적립";
                case USE -> "사용";
                case EXPIRE -> "만료";
                case REFUND -> "반환";
            };
        }

        private static String getHistoryTitle(PointHistory pointHistory) {
            if (pointHistory.getEventHistory() != null && pointHistory.getEventHistory().getEvent() != null) {
                return pointHistory.getEventHistory().getEvent().getTitle();
            }
            if (pointHistory.getPayment() != null) {
                return "콘서트 티켓 예매 결제";
            }
            return "시스템 포인트 조정";
        }
    }

    /**
     * 2. 30일 내 만료 예정 포인트 조회용 DTO
     */
    public record ExpiringDTO(
            Integer id,
            String title,
            Integer balance,
            String expiredAt
    ) {
        public ExpiringDTO(PointHistory pointHistory) {
            this(
                    pointHistory.getId(),
                    getHistoryTitle(pointHistory),
                    pointHistory.getBalance(),
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
