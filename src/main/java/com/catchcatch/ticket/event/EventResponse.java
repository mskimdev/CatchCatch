package com.catchcatch.ticket.event;

import com.catchcatch.ticket.core.util.DateUtil;

public class EventResponse {

    public record ListDTO(
            Integer id,
            String title,
            String description,
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
            Integer rewardPoint,
            String startDate,
            String endDate,
            boolean isActive
    ) {
        public DetailDTO(Event event) {
            this(
                    event.getId(),
                    event.getTitle(),
                    event.getDescription(),
                    event.getRewardPoint(),
                    DateUtil.format(event.getStartDate()),
                    DateUtil.format(event.getEndDate()),
                    event.isActive()
            );
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
}