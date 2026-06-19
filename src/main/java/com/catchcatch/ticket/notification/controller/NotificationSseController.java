package com.catchcatch.ticket.notification.controller;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.notification.service.NotificationSseService;
import com.catchcatch.ticket.user.dto.SessionUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationSseController {

    private final NotificationSseService notificationSseService;

    @GetMapping(value = "/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser
    ) {
        return notificationSseService.subscribe(sessionUser.getId());
    }
}