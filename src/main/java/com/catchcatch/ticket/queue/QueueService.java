package com.catchcatch.ticket.queue;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.exception.NotFoundException;
import com.catchcatch.ticket.core.sse.SseEmitterRepository;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class QueueService {

    private static final int TOKEN_EXPIRE_MINUTES = 10;
    private static final List<QueueStatus> ACTIVE_STATUSES = List.of(QueueStatus.WAITING, QueueStatus.READY);

    private final QueueRepository queueRepository;
    private final UserRepository userRepository;
    private final SseEmitterRepository sseEmitterRepository;

    /**
     * 대기열 진입
     *
     * 이미 진행 중인 항목(WAITING/READY)이 있으면 그걸 그대로 반환해
     * 새로고침 등으로 중복 등록되지 않게 한다.
     */
    @Transactional
    public QueueResponse.StatusDTO enter(Integer concertSessionId, Integer userId) {
        var existing = queueRepository.findByConcertSessionIdAndUser_IdAndStatusIn(
                concertSessionId, userId, ACTIVE_STATUSES
        );

        if (existing.isPresent()) {
            return toStatusDTO(existing.get());
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("사용자를 찾을 수 없습니다."));

        int nextNumber = queueRepository.findMaxQueueNumber(concertSessionId) + 1;

        WaitingQueue queue = WaitingQueue.builder()
                .user(user)
                .concertSessionId(concertSessionId)
                .queueNumber(nextNumber)
                .status(QueueStatus.WAITING)
                .build();

        queueRepository.save(queue);

        return toStatusDTO(queue);
    }

    @Transactional(readOnly = true)
    public QueueResponse.StatusDTO getStatus(Integer queueId) {
        return toStatusDTO(findQueue(queueId));
    }

    /**
     * 좌석 선택 화면 진입 허용 여부
     *
     * 이 회차에 대해 ENTERED 상태(대기열을 통과해 입장 처리된) 항목이 있는지 확인한다.
     */
    @Transactional(readOnly = true)
    public boolean hasEnteredAccess(Integer concertSessionId, Integer userId) {
        return queueRepository.findByConcertSessionIdAndUser_IdAndStatusIn(
                concertSessionId, userId, List.of(QueueStatus.ENTERED)
        ).isPresent();
    }

    /**
     * 입장 처리
     *
     * 대기열 화면에서 READY 상태가 되어 좌석 선택 화면으로 이동하기 직전에 호출한다.
     * 호출이 끝나면 ENTERED 상태가 되어 BookingController.seatForm()의
     * hasEnteredAccess() 체크를 통과할 수 있다.
     */
    @Transactional
    public void enterBooking(Integer queueId) {
        WaitingQueue queue = findQueue(queueId);
        validateReadyAndNotExpired(queue);
        queue.entered();
    }

    /**
     * 입장 토큰 검증
     *
     * entryToken만으로 입장 처리해야 하는 경우(예: 이메일/푸시로 받은 링크) 사용한다.
     */
    @Transactional
    public void enterBooking(String entryToken) {
        WaitingQueue queue = queueRepository.findByEntryToken(entryToken)
                .orElseThrow(() -> new BadRequestException("유효하지 않은 입장 정보입니다."));
        validateReadyAndNotExpired(queue);
        queue.entered();
    }

    private void validateReadyAndNotExpired(WaitingQueue queue) {
        if (queue.getStatus() != QueueStatus.READY) {
            throw new BadRequestException("입장 가능한 상태가 아닙니다.");
        }

        if (queue.getTokenExpiresAt().before(now())) {
            queue.expired();
            throw new BadRequestException("입장 가능 시간이 만료되었습니다. 대기열에 다시 등록해주세요.");
        }
    }

    /**
     * 스케줄러 - 대기 중인 앞쪽 N명을 READY로 전환하고 SSE로 알린다.
     */
    @Transactional
    public void promoteNext(Integer concertSessionId, int count) {
        List<WaitingQueue> waitingList = queueRepository
                .findByConcertSessionIdAndStatusOrderByQueueNumberAsc(concertSessionId, QueueStatus.WAITING)
                .stream()
                .limit(count)
                .toList();

        if (waitingList.isEmpty()) {
            return;
        }

        for (WaitingQueue queue : waitingList) {
            String token = UUID.randomUUID().toString();
            Timestamp expiresAt = Timestamp.valueOf(LocalDateTime.now().plusMinutes(TOKEN_EXPIRE_MINUTES));
            queue.ready(token, expiresAt);
        }

        sseEmitterRepository.send("queue:" + concertSessionId, "queue-updated", "");
    }

    /**
     * 스케줄러 - READY 상태인데 입장하지 않고 토큰 유효 시간이 지난 항목을 정리한다.
     */
    @Transactional
    public void expireReadyQueues() {
        queueRepository.findByStatusAndTokenExpiresAtBefore(QueueStatus.READY, now())
                .forEach(WaitingQueue::expired);
    }

    private QueueResponse.StatusDTO toStatusDTO(WaitingQueue queue) {
        long waitingAhead = queue.getStatus() == QueueStatus.WAITING
                ? queueRepository.countWaitingAhead(queue.getConcertSessionId(), queue.getQueueNumber())
                : 0;

        return QueueResponse.StatusDTO.of(queue, waitingAhead);
    }

    private WaitingQueue findQueue(Integer queueId) {
        return queueRepository.findById(queueId)
                .orElseThrow(() -> new NotFoundException("대기열 정보를 찾을 수 없습니다."));
    }

    private Timestamp now() {
        return Timestamp.valueOf(LocalDateTime.now());
    }
}
