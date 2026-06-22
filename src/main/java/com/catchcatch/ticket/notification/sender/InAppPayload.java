package com.catchcatch.ticket.notification.sender;

import com.catchcatch.ticket.notification.enums.NotificationType;
import com.catchcatch.ticket.user.User;
import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class InAppPayload {
    private User recipient;
    private NotificationType type;
    private String title;
    private String content;
    private String targetUrl;
}
