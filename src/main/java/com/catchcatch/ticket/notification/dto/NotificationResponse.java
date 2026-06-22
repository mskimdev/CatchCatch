package com.catchcatch.ticket.notification.dto;

import com.catchcatch.ticket.core.util.DateUtil;
import com.catchcatch.ticket.notification.Notification;

public class NotificationResponse {

    public record ListDTO(
            Integer id,
            String type,
            String title,
            String content,
            String targetUrl,
            boolean read,
            String createdAt
    ) {
        public ListDTO(Notification notification) {
            this(
                    notification.getId(),
                    notification.getType().name(),
                    notification.getTitle(),
                    notification.getContent(),
                    notification.getTargetUrl(),
                    notification.isRead(),
                    DateUtil.formatDateTime(notification.getCreatedAt())
            );
        }
    }

     //SSE로 실시간 전송할 데이터
    public record PushDTO(
            Integer id,
            String title,
            String content,
            String targetUrl,
            long unreadCount
    ) {}
}