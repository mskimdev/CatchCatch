package com.catchcatch.ticket.queue;

import com.catchcatch.ticket.core.sse.SseEmitterRepository;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/queue")
public class QueueApiController {

    private final QueueService queueService;
    private final SseEmitterRepository sseEmitterRepository;

    @PostMapping("/enter")
    public ResponseEntity<?> enter(@Valid @RequestBody QueueRequest.EnterDTO req, HttpSession session) {
        Integer userId = getSessionUser(session).getId();
        return Resp.ok(queueService.enter(req.concertSessionId(), userId));
    }

    @GetMapping("/{queueId}/status")
    public ResponseEntity<?> getStatus(@PathVariable Integer queueId) {
        return Resp.ok(queueService.getStatus(queueId));
    }

    @PostMapping("/{queueId}/enter-booking")
    public ResponseEntity<?> enterBooking(@PathVariable Integer queueId) {
        queueService.enterBooking(queueId);
        return Resp.ok(null);
    }

    @GetMapping(value = "/subscribe/{concertSessionId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribe(@PathVariable Integer concertSessionId) {
        return sseEmitterRepository.subscribe("queue:" + concertSessionId);
    }

    @GetMapping(value = "/admin/subscribe", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeAdmin(){
        return sseEmitterRepository.subscribe("admin:queue-stats");
    }

    private SessionUser getSessionUser(HttpSession session) {
        return (SessionUser) session.getAttribute(Define.SESSION_USER);
    }
}