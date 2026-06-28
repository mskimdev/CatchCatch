package com.catchcatch.ticket.event.controller;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.event.dto.EventResponse;
import com.catchcatch.ticket.event.service.EventService;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RequiredArgsConstructor
@RestController
public class EventApiController {

    private final EventService eventService;

    /**
     * 이벤트 참여 신청
     */
    @PostMapping("/api/events/{eventId}/join")
    public ResponseEntity<?> joinEvent(@PathVariable Integer eventId, HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "로그인이 필요합니다."));
        }

        try {
            EventResponse.JoinDTO responseDTO =
                    eventService.joinEvent(sessionUser.getId(), eventId);

            // 세션 동기화
            SessionUser updatedUser = new SessionUser(sessionUser, responseDTO.currentPoint());

            session.setAttribute(Define.SESSION_USER, updatedUser);

            return ResponseEntity.ok(responseDTO);

        } catch (RuntimeException e) {
            return ResponseEntity
                    .status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("message", e.getMessage()));
        }
    }
}
