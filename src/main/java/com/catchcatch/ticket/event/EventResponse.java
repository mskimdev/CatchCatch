package com.catchcatch.ticket.event;

import com.catchcatch.ticket.core.util.DateUtil;

public class EventResponse {

    public record ListDTO(
            Integer id,
            String title,
            String description,
            String imageUrl,
            Integer rewardPoint,
            String statusLabel,
            String startDate,
            String endDate
    ) {
        public ListDTO(Event event, String selectedStatus) {
            this(
                    event.getId(),
                    event.getTitle(),
                    event.getDescription(),
                    event.getImageUrl(),
                    event.getRewardPoint(),
                    getStatusLabel(selectedStatus),
                    DateUtil.format(event.getStartDate()),
                    DateUtil.format(event.getEndDate())
            );
        }

        private static String getStatusLabel(String status) {
            return switch (status) {
                case "upcoming" -> "예정";
                case "ended" -> "종료";
                default -> "진행 중";
            };
        }
    }

    public record DetailDTO(
            Integer id,
            String title,
            String description,
            String noticeContent,
            String imageUrl,
            Integer rewardPoint,
            String startDate,
            String endDate,
            boolean isActive,
            String conditionType,
            String conditionLabel,
            boolean alreadyJoined
    ) {
        public DetailDTO(Event event, boolean alreadyJoined) {
            this(
                    event.getId(),
                    event.getTitle(),
                    event.getDescription(),
                    event.getNoticeContent(),
                    event.getImageUrl(),
                    event.getRewardPoint(),
                    DateUtil.format(event.getStartDate()),
                    DateUtil.format(event.getEndDate()),
                    event.isActive(),
                    event.getConditionType().name(),
                    getConditionLabel(event.getConditionType()),
                    alreadyJoined
            );
        }

        private static String getConditionLabel(ConditionType type) {
            return switch (type) {
                case BOOKING_HISTORY -> "예매 이력 보유 회원";
                case SPECIFIC_CONCERT -> "특정 콘서트 예매자";
                default -> "누구나 참여 가능";
            };
        }
    }

    public record JoinDTO(
            Integer eventId,
            String title,
            Integer rewardPoint,
            Integer currentPoint,
            String message
    ) {
        public JoinDTO(Event event, Integer currentPoint) {
            this(
                    event.getId(),
                    event.getTitle(),
                    event.getRewardPoint(),
                    currentPoint,
                    "이벤트 참여가 완료되었습니다."
            );
        }
    }

    // 어드민 목록용
    public record AdminListDTO(
            Integer id,
            String title,
            Integer rewardPoint,
            String conditionLabel,
            String startDate,
            String endDate,
            String statusLabel,
            boolean isOngoing,
            boolean isUpcoming,
            boolean isEnded
    ) {
        public AdminListDTO(Event event, String statusLabel) {
            this(
                    event.getId(),
                    event.getTitle(),
                    event.getRewardPoint(),
                    getConditionLabel(event.getConditionType()),
                    DateUtil.format(event.getStartDate()),
                    DateUtil.format(event.getEndDate()),
                    statusLabel,
                    "진행 중".equals(statusLabel),
                    "예정".equals(statusLabel),
                    "종료".equals(statusLabel)
            );
        }

        private static String getConditionLabel(ConditionType type) {
            return switch (type) {
                case BOOKING_HISTORY -> "예매 이력";
                case SPECIFIC_CONCERT -> "특정 콘서트";
                default -> "누구나";
            };
        }
    }

    // 어드민 수정 폼용
    public record AdminDetailDTO(
            Integer id,
            String title,
            String description,
            String noticeContent,
            String imageUrl,
            String conditionType,
            Integer conditionConcertId,
            Integer rewardPoint,
            Integer pointValidMonths,
            String startDate,
            String endDate
    ) {
        public AdminDetailDTO(Event event) {
            this(
                    event.getId(),
                    event.getTitle(),
                    event.getDescription(),
                    event.getNoticeContent(),
                    event.getImageUrl(),
                    event.getConditionType().name(),
                    event.getConditionConcertId(),
                    event.getRewardPoint(),
                    event.getPointValidMonths(),
                    DateUtil.formatForInput(event.getStartDate()),
                    DateUtil.formatForInput(event.getEndDate())
            );
        }
    }
}
