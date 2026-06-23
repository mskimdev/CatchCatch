package com.catchcatch.ticket.notification.sender;

import com.catchcatch.ticket.notification.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

// 인앱(DB+SSE) 알림 전송을 담당한다. EmailSender/SmsSender와 같은
// MessageSender 계약을 따르며, NotificationDispatcher가 채널 중 하나로 사용한다.
@Component
@RequiredArgsConstructor
public class InAppSender implements MessageSender<InAppPayload> {

    private final NotificationService notificationService;

    @Override
    public void send(InAppPayload payload) {
        notificationService.create(
                payload.getRecipient(),
                payload.getType(),
                payload.getTitle(),
                payload.getContent(),
                payload.getTargetUrl()
        );
    }
}
