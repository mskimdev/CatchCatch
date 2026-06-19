package com.catchcatch.ticket.queue;

import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@RequiredArgsConstructor
@Component
public class QueueScheduler {

    // 좌석 선택~결제 단계에 동시 수용 가능한 인원(READY + ENTERED) 상한
    private static final int CAPACITY_PER_SESSION = 50;

    private final QueueService queueService;
    private final QueueRepository queueRepository;

    // 5초마다 회차별로 빈자리(capacity - 활성 인원)만큼 WAITING 앞쪽을 READY로 승격
    @Scheduled(fixedDelay = 5000)
    public void promoteWaitingQueues() {
        queueRepository.findDistinctWaitingConcertSessionIds()
                .forEach(sessionId -> {
                    long activeCount = queueRepository.countActiveBySession(sessionId);
                    int availableSlots = (int) (CAPACITY_PER_SESSION - activeCount);
                    if (availableSlots > 0) {
                        queueService.promoteNext(sessionId, availableSlots);
                    }
                });
    }

    // 1분마다 READY인데 입장하지 않고 시간 초과된 항목 정리
    @Scheduled(fixedDelay = 60000)
    public void expireReadyQueues() {
        queueService.expireReadyQueues();
    }
}
