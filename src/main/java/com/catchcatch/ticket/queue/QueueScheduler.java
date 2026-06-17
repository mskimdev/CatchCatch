package com.catchcatch.ticket.queue;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component
public class QueueScheduler {

    private static final int PROMOTE_COUNT_PER_TICK = 5;

    private final QueueService queueService;
    private final QueueRepository queueRepository;

    // 5초마다 회차별 대기열 앞 N명을 READY로 승격
    @Scheduled(fixedDelay = 5000)
    public void promoteWaitingQueues() {
        queueRepository.findDistinctWaitingConcertSessionIds()
                .forEach(sessionId -> queueService.promoteNext(sessionId, PROMOTE_COUNT_PER_TICK));
    }

    // 1분마다 READY인데 입장하지 않고 시간 초과된 항목 정리
    @Scheduled(fixedDelay = 60000)
    public void expireReadyQueues() {
        queueService.expireReadyQueues();
    }
}
