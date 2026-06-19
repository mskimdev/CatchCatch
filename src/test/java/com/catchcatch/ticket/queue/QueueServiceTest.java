package com.catchcatch.ticket.queue;

import com.catchcatch.ticket.core.sse.SseEmitterRepository;
import com.catchcatch.ticket.user.User;
import com.catchcatch.ticket.user.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class QueueServiceTest {

    private static final String ADMIN_QUEUE_STATS_KEY = "admin:queue-stats";
    private static final String ADMIN_QUEUE_STATS_EVENT = "queue-stats-updated";

    @Mock
    private QueueRepository queueRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private SseEmitterRepository sseEmitterRepository;

    @InjectMocks
    private QueueService queueService;

    private User user;

    @BeforeEach
    void setUp() {
        user = User.builder().username("tester").build();
        user.setId(1);
    }

    @Test
    void enter_새로진입하면_대기번호를_발급하고_관리자에게_알린다() {
        Integer concertSessionId = 10;

        when(queueRepository.findByConcertSessionIdAndUser_IdAndStatusIn(
                eq(concertSessionId), eq(user.getId()), any()))
                .thenReturn(Optional.empty());
        when(userRepository.findById(user.getId())).thenReturn(Optional.of(user));
        when(queueRepository.findMaxQueueNumber(concertSessionId)).thenReturn(5);
        when(queueRepository.save(any(WaitingQueue.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        QueueResponse.StatusDTO result = queueService.enter(concertSessionId, user.getId());

        assertThat(result.queueNumber()).isEqualTo(6);
        assertThat(result.status()).isEqualTo(QueueStatus.WAITING);
        verify(sseEmitterRepository).send(ADMIN_QUEUE_STATS_KEY, ADMIN_QUEUE_STATS_EVENT, "");
    }

    @Test
    void enter_이미_대기중이면_새로_등록하지_않고_기존_정보를_반환한다() {
        Integer concertSessionId = 10;
        WaitingQueue existing = WaitingQueue.builder()
                .id(99)
                .user(user)
                .concertSessionId(concertSessionId)
                .queueNumber(3)
                .status(QueueStatus.WAITING)
                .build();

        when(queueRepository.findByConcertSessionIdAndUser_IdAndStatusIn(
                eq(concertSessionId), eq(user.getId()), any()))
                .thenReturn(Optional.of(existing));
        when(queueRepository.countWaitingAhead(concertSessionId, 3)).thenReturn(2L);

        QueueResponse.StatusDTO result = queueService.enter(concertSessionId, user.getId());

        assertThat(result.queueId()).isEqualTo(99);
        assertThat(result.waitingAhead()).isEqualTo(2L);
        verify(queueRepository, never()).save(any());
        verify(sseEmitterRepository, never()).send(anyString(), anyString(), any());
    }

    @Test
    void promoteNext_대기인원을_READY로_전환하고_두_채널로_알린다() {
        Integer concertSessionId = 10;
        WaitingQueue waiting1 = WaitingQueue.builder()
                .id(1).user(user).concertSessionId(concertSessionId)
                .queueNumber(1).status(QueueStatus.WAITING).build();
        WaitingQueue waiting2 = WaitingQueue.builder()
                .id(2).user(user).concertSessionId(concertSessionId)
                .queueNumber(2).status(QueueStatus.WAITING).build();

        when(queueRepository.findByConcertSessionIdAndStatusOrderByQueueNumberAsc(
                concertSessionId, QueueStatus.WAITING))
                .thenReturn(List.of(waiting1, waiting2));

        queueService.promoteNext(concertSessionId, 5);

        assertThat(waiting1.getStatus()).isEqualTo(QueueStatus.READY);
        assertThat(waiting2.getStatus()).isEqualTo(QueueStatus.READY);
        assertThat(waiting1.getEntryToken()).isNotBlank();

        verify(sseEmitterRepository).send("queue:" + concertSessionId, "queue-updated", "");
        verify(sseEmitterRepository).send(ADMIN_QUEUE_STATS_KEY, ADMIN_QUEUE_STATS_EVENT, "");
    }

    @Test
    void promoteNext_대기인원이_없으면_아무_알림도_보내지_않는다() {
        Integer concertSessionId = 10;
        when(queueRepository.findByConcertSessionIdAndStatusOrderByQueueNumberAsc(
                concertSessionId, QueueStatus.WAITING))
                .thenReturn(List.of());

        queueService.promoteNext(concertSessionId, 5);

        verify(sseEmitterRepository, never()).send(anyString(), anyString(), any());
    }

    @Test
    void expireReadyQueues_만료된_항목을_처리하고_관리자에게_알린다() {
        WaitingQueue expiring = WaitingQueue.builder()
                .id(1).user(user).concertSessionId(10)
                .queueNumber(1).status(QueueStatus.READY)
                .tokenExpiresAt(Timestamp.valueOf(LocalDateTime.now().minusMinutes(1)))
                .build();

        when(queueRepository.findByStatusAndTokenExpiresAtBefore(eq(QueueStatus.READY), any()))
                .thenReturn(List.of(expiring));

        queueService.expireReadyQueues();

        assertThat(expiring.getStatus()).isEqualTo(QueueStatus.EXPIRED);
        verify(sseEmitterRepository).send(ADMIN_QUEUE_STATS_KEY, ADMIN_QUEUE_STATS_EVENT, "");
    }
}