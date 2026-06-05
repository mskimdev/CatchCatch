package com.catchcatch.ticket.notification;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class NotificationMessage {
    private String to;
    private String subject;
    private String content;
    private boolean html;
}
