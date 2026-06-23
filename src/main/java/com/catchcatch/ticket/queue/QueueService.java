package com.catchcatch.ticket.queue;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.core.sse.SseEmitterRepository;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.seat.SeatStatus;
import com.catchcatch.ticket.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class QueueService {

    private static final Duration READY_TTL = Duration.ofMinutes(10);
    private static final String ADMIN_QUEUE_STATS_KEY = "admin:queue-stats";

    // 좌석 선택~결제 단계에 동시 수용 가능한 인원(READY + ENTERED) 상한 - 시스템이 버틸 수 있는 고정값
    private static final int FIXED_SYSTEM_LIMIT = 500;

    private final UserRepository userRepository;
    private final SseEmitterRepository sseEmitterRepository;
    private final QueueRedisRepository queueRedisRepository;
    private final SeatRepository seatRepository;

    /**
     * 대기열 진입. 이미 WAITING, READY, ENTERED 상태면 새로 등록 X 현재 그대로 반환
     */
    public QueueResponse.StatusDTO enter(Integer concertSessionId, Integer userId) {
        var existing = currentStatus(concertSessionId, userId);
        if (existing.isPresent()) {
            return existing.get();
        }

        userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));

        long queueNumber = queueRedisRepository.enqueueWaiting(concertSessionId, userId);
        long waitingAhead = queueRedisRepository.countWaitingAhead(concertSessionId, queueNumber);

        sseEmitterRepository.send(ADMIN_QUEUE_STATS_KEY, "queue-stats-updated", "");

        // 자리가 비어있는데도 아무도 빠져나가지 않아 승격 트리거가 없던 회차(첫 진입자 등)를 위해
        // 등록 직후 즉시 승격을 시도한다. capacity 검증은 promoteNext 내부에서 처리된다.
        promoteNext(concertSessionId, 1);

        return new QueueResponse.StatusDTO(concertSessionId, QueueStatus.WAITING, queueNumber, waitingAhead, null);
    }

    /**
     * 현재 상태 조회 (read-only). 대기열에 없으면 등록하지 않고 예외를 던진다.
     */
    public QueueResponse.StatusDTO getStatus(Integer concertSessionId, Integer userId) {
        return currentStatus(concertSessionId, userId)
                .orElseThrow(() -> new NotFoundException("대기열 정보를 찾을 수 없습니다."));
    }

    private Optional<QueueResponse.StatusDTO> currentStatus(Integer concertSessionId, Integer userId) {
        if (queueRedisRepository.isEntered(concertSessionId, userId)) {
            return Optional.of(new QueueResponse.StatusDTO(concertSessionId, QueueStatus.ENTERED, null, 0, null));
        }

        if (queueRedisRepository.isReady(concertSessionId, userId)) {
            String token = queueRedisRepository.getReadyToken(concertSessionId, userId).orElse(null);
            return Optional.of(new QueueResponse.StatusDTO(concertSessionId, QueueStatus.READY, null, 0, token));
        }

        if (queueRedisRepository.isWaiting(concertSessionId, userId)) {
            long myNumber = queueRedisRepository.getQueueNumber(concertSessionId, userId).orElse(0L);
            long waitingAhead = queueRedisRepository.countWaitingAhead(concertSessionId, myNumber);
            return Optional.of(new QueueResponse.StatusDTO(concertSessionId, QueueStatus.WAITING, myNumber, waitingAhead, null));
        }

        return Optional.empty();
    }

    /**
     * 좌석 선택 화면 진입 허용 여부
     *
     * 이 회차에 대해 ENTERED 상태(대기열을 통과해 입장 처리된) 항목이 있는지 확인한다.
     */
    public boolean hasEnteredAccess(Integer concertSessionId, Integer userId) {
        return queueRedisRepository.isEntered(concertSessionId, userId);
    }

    /**
     * 입장 처리
     *
     * 대기열 화면에서 READY 상태가 되어 좌석 선택 화면으로 이동하기 직전에 호출한다.
     * 호출이 끝나면 ENTERED 상태가 되어 BookingController.seatForm()의
     * hasEnteredAccess() 체크를 통과할 수 있다.
     */
    public void enterBooking(Integer concertSessionId, Integer userId) {
        if (!queueRedisRepository.isReady(concertSessionId, userId)) {
            throw new BadRequestException("입장 가능한 상태가 아닙니다.");
        }

        String token = queueRedisRepository.getReadyToken(concertSessionId, userId).orElse(null);
        queueRedisRepository.clearReady(concertSessionId, userId, token);
        queueRedisRepository.markEntered(concertSessionId, userId);
    }

    /**
     * 입장 토큰 검증
     *
     * entryToken만으로 입장 처리해야 하는 경우(예: 이메일/푸시로 받은 링크) 사용한다.
     */
    public void enterBooking(String entryToken) {
        int[] resolved = queueRedisRepository.resolveToken(entryToken)
                .orElseThrow(() -> new BadRequestException("유효하지 않은 입장 정보입니다."));
        Integer concertSessionId = resolved[0];
        Integer userId = resolved[1];

        enterBooking(concertSessionId, userId);
        sseEmitterRepository.send(ADMIN_QUEUE_STATS_KEY, "queue-stats-updated", "");
    }

    /**
     * 대기 중인 앞쪽 N명을 READY로 전환하고 SSE로 알린다.
     * (기존에는 5초 주기 스케줄러가 호출했으나, 이제는 자리가 빌 때(결제완료/취소/READY만료) 직접 호출된다.)
     *
     * capacity(READY+ENTERED 상한)를 넘는 만큼은 자동으로 잘라낸다 -
     * 호출하는 쪽이 매번 capacity를 직접 확인하지 않아도 안전하게 만든다.
     * capacity = min(시스템이 버틸 수 있는 고정 상한, 남은 AVAILABLE 좌석 수) - 현재 활성 인원
     */
    public void promoteNext(Integer concertSessionId, int count) {
        long availableSeatCount = seatRepository.countByConcertSession_IdAndStatus(concertSessionId, SeatStatus.AVAILABLE);
        long capacity = Math.min(FIXED_SYSTEM_LIMIT, availableSeatCount);

        long activeCount = queueRedisRepository.countActiveBySession(concertSessionId);
        int availableSlots = (int) Math.max(0, capacity - activeCount);
        int promoteCount = Math.min(count, availableSlots);

        if (promoteCount <= 0) {
            return;
        }

        Set<ZSetOperations.TypedTuple<String>> popped =
                queueRedisRepository.popFrontWaiting(concertSessionId, promoteCount);

        if (popped.isEmpty()) {
            return;
        }

        for (ZSetOperations.TypedTuple<String> tuple : popped) {
            Integer userId = Integer.parseInt(tuple.getValue());
            queueRedisRepository.promoteToReady(concertSessionId, userId, READY_TTL);
        }

        queueRedisRepository.removeFromActiveSessionsIfEmpty(concertSessionId);

        sseEmitterRepository.send("queue:" + concertSessionId, "queue-updated", "");
        sseEmitterRepository.send(ADMIN_QUEUE_STATS_KEY, "queue-stats-updated", "");
    }

    // READY 토큰이 TTL 만료된 직후 호출된다.
    // readySet에서 만료된 유저를 제거하고, 빈자리만큼 다음 대기자를 즉시 승격시킨다.
    public void onReadyExpired(Integer concertSessionId, Integer userId) {
        queueRedisRepository.clearReady(concertSessionId, userId, null);
        promoteNext(concertSessionId, 1);
    }

    // 결제완료/취소/만료로 예매 프로세스를 빠져나갈 때 호출된다.
    // ENTERED 상태를 해제하고, 빈자리만큼 다음 대기자를 즉시 승격시킨다.
    public void releaseEnteredSlot(Integer concertSessionId, Integer userId) {
        queueRedisRepository.clearEntered(concertSessionId, userId);
        promoteNext(concertSessionId, 1);
    }
}
