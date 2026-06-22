package com.catchcatch.ticket.notification.controller;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.notification.service.NotificationService;
import com.catchcatch.ticket.user.dto.SessionUser;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
public class NotificationApiController {

    private final NotificationService notificationService;

    @GetMapping("/unread-count")
    public ResponseEntity<?> unreadCount(
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser
    ){
        long count = notificationService.countUnread(sessionUser.getId());
        return Resp.ok(count);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> read(
            @PathVariable Integer id,
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser
    ) {
        notificationService.markAsRead(id, sessionUser.getId());
        return Resp.ok("알림을 읽음 처리했습니다");
    }

   // 알림 전체 조회
    @GetMapping
    public ResponseEntity<?> notifications(
            @SessionAttribute(Define.SESSION_USER) SessionUser sessionUser
    ) {
        return Resp.ok(notificationService.findMyNotifications(sessionUser.getId()));
    }

}
