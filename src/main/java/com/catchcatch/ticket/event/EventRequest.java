package com.catchcatch.ticket.event;

import com.catchcatch.ticket.core.util.DateUtil;
import com.catchcatch.ticket.core.util.HtmlSanitizer;

import java.sql.Timestamp;

public class EventRequest {

    public record SaveDTO(
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
        public Event toEntity() {
            return Event.builder()
                    .title(title)
                    .description(description)
                    .noticeContent(HtmlSanitizer.sanitize(noticeContent))
                    .imageUrl(imageUrl)
                    .conditionType(parseConditionType(conditionType))
                    .conditionConcertId(conditionConcertId)
                    .rewardPoint(rewardPoint)
                    .pointValidMonths(pointValidMonths)
                    .startDate(DateUtil.parseToTimestamp(startDate))
                    .endDate(DateUtil.parseToTimestamp(endDate))
                    .build();
        }
    }

    public record UpdateDTO(
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
        public void applyTo(Event event) {
            event.update(
                    title,
                    description,
                    HtmlSanitizer.sanitize(noticeContent),
                    imageUrl,
                    parseConditionType(conditionType),
                    conditionConcertId,
                    rewardPoint,
                    pointValidMonths,
                    DateUtil.parseToTimestamp(startDate),
                    DateUtil.parseToTimestamp(endDate)
            );
        }
    }

    private static ConditionType parseConditionType(String value) {
        if (value == null || value.isBlank()) return ConditionType.NONE;
        try {
            return ConditionType.valueOf(value);
        } catch (IllegalArgumentException e) {
            return ConditionType.NONE;
        }
    }
}
