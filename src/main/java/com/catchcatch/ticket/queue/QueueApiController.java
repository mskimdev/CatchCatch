package com.catchcatch.ticket.queue;

import com.catchcatch.ticket.core.exception.BadRequestException;
import java.util.List;
import com.catchcatch.ticket.core.sse.SseEmitterRepository;
import com.catchcatch.ticket.core.util.Define;
import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.payment.PaymentService;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.seat.SeatStatus;
import com.catchcatch.ticket.user.dto.SessionUser;
import jakarta.servlet.http.HttpSession;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
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
    private final PaymentService paymentService;
    private final SeatRepository seatRepository;

    @Value("${catchcatch.loadtest-api-key}")
    private String loadtestApiKey;

    @PostMapping("/enter")
    public ResponseEntity<?> enter(@Valid @RequestBody QueueRequest.EnterDTO req, HttpSession session) {
        Integer userId = getSessionUser(session).getId();
        return Resp.ok(queueService.enter(req.concertSessionId(), userId));
    }

    @GetMapping("/{concertSessionId}/status")
    public ResponseEntity<?> getStatus(@PathVariable Integer concertSessionId, HttpSession session) {
        Integer userId = getSessionUser(session).getId();
        return Resp.ok(queueService.getStatus(concertSessionId, userId));
    }

    @PostMapping("/{concertSessionId}/enter-booking")
    public ResponseEntity<?> enterBooking(@PathVariable Integer concertSessionId, HttpSession session) {
        Integer userId = getSessionUser(session).getId();
        queueService.enterBooking(concertSessionId, userId);
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

    // 어드민이 특정 회차를 선택해서 모니터링할 때만 구독하는 회차별 채널.
    // 전역 채널과 별개로, 선택된 회차의 변경 사항만 받아볼 수 있다.
    @GetMapping(value = "/admin/subscribe/{concertSessionId}", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter subscribeAdminSession(@PathVariable Integer concertSessionId){
        return sseEmitterRepository.subscribe("admin:queue-stats:" + concertSessionId);
    }

    // TODO - 테스트용으로 실제 배포시엔 삭제 예정
    // 부하 테스트용: 본인의 ENTERED 상태 강제 해소. X-Loadtest-Key 헤더 + 세션 로그인으로 인증.
    @DeleteMapping("/admin/entered/{concertSessionId}")
    public ResponseEntity<?> forceReleaseEntered(
            @PathVariable Integer concertSessionId,
            @RequestHeader("X-Loadtest-Key") String apiKey,
            HttpSession session
    ) {
        if (!loadtestApiKey.equals(apiKey)) {
            throw new BadRequestException("유효하지 않은 API 키입니다.");
        }
        Integer userId = getSessionUser(session).getId();
        queueService.releaseEnteredSlot(concertSessionId, userId);
        return Resp.ok(null);
    }

    // TODO - 부하 테스트를 위한 결제 우회(김민수) 삭제 예정
    // k6가 좌석 선택 전에 AVAILABLE 좌석 ID 목록을 조회하는 데 사용한다.
    @GetMapping("/admin/seats")
    public ResponseEntity<?> availableSeatIds(@RequestParam Integer sessionId) {
        List<Integer> seatIds = seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(sessionId)
                .stream()
                .filter(s -> s.getStatus() == SeatStatus.AVAILABLE)
                .map(s -> s.getId())
                .toList();
        return Resp.ok(seatIds);
    }

    // TODO - 부하 테스트를 위한 결제 우회(김민수) 삭제 예정
    // 포트원 검증 없이 결제를 완료 처리한다.
    // 좌석선택→예매생성→결제준비까지 정상 흐름을 거친 뒤 이 API로 마무리한다.
    // X-Loadtest-Key 헤더 + 세션 로그인으로 인증.
    @PostMapping("/admin/payment/bypass")
    public ResponseEntity<?> bypassPayment(
            @RequestParam("paymentId") String paymentId,
            @RequestHeader("X-Loadtest-Key") String apiKey,
            HttpSession session
    ) {
        if (!loadtestApiKey.equals(apiKey)) {
            throw new BadRequestException("유효하지 않은 API 키입니다.");
        }
        Integer userId = getSessionUser(session).getId();
        return Resp.ok(paymentService.completePaymentBypass(userId, paymentId));
    }

    private SessionUser getSessionUser(HttpSession session) {
        return (SessionUser) session.getAttribute(Define.SESSION_USER);
    }
}