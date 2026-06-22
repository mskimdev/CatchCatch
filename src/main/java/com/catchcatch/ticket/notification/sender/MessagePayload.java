package com.catchcatch.ticket.notification.sender;

import lombok.Builder;
import lombok.Getter;

@Builder
@Getter
public class MessagePayload {
    private String to;
    private String subject;
    private String content;
    private boolean html;
}
