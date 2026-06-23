package com.catchcatch.ticket.queue;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * 승격/만료 정리는 이제 이벤트 기반(QueueKeyExpirationListener, 결제완료/취소/만료 시점 직접 호출)으로 처리된다.
 * 이 스케줄러는 이벤트 유실(Redis 재시작, 리스너 끊김 등) 대비 저빈도 안전망 역할만 한다.
 */
@RequiredArgsConstructor
@Component
public class QueueScheduler {

    private final QueueService queueService;
    private final QueueRedisRepository queueRedisRepository;

    // 5분마다 모든 활성 회차를 순회하며 readySet 정리 + 누락된 승격을 보정한다.
    // capacity 검증은 QueueService.promoteNext() 안에서 처리되므로 여기서는 신경 쓰지 않는다.
    @Scheduled(fixedDelay = 5 * 60 * 1000)
    public void reconcileQueues() {
        queueRedisRepository.findActiveSessionIds().forEach(sessionIdStr -> {
            Integer sessionId = Integer.parseInt(sessionIdStr);

            queueRedisRepository.pruneExpiredReady(sessionId);
            queueService.promoteNext(sessionId, (int) queueRedisRepository.countWaitingBySession(sessionId));
        });
    }
}
