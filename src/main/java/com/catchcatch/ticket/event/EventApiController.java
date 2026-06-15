package com.catchcatch.ticket.event;

import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.ResponseBody;

import java.util.Map;

@RequiredArgsConstructor
public class EventApiController {

    private final EventService eventService;

    /**
     * 이벤트 참여 신청
     */
    @PostMapping("/api/events/{eventId}/join")
    @ResponseBody
    public ResponseEntity<?> joinEvent(@PathVariable Integer eventId, HttpSession session) {

        SessionUser sessionUser = (SessionUser) session.getAttribute(Define.SESSION_USER);

        if (sessionUser == null) {
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of("message", "로그인이 필요합니다."));
        }

        EventResponse.JoinDTO responseDTO =
                eventService.joinEvent(sessionUser.getId(), eventId);

        return ResponseEntity.ok(responseDTO);
    }
}
