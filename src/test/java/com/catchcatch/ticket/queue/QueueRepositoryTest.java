package com.catchcatch.ticket.queue;

import com.catchcatch.ticket.core.config.QueryDslConfig;
import com.catchcatch.ticket.user.User;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.orm.jpa.DataJpaTest;
import org.springframework.boot.test.autoconfigure.orm.jpa.TestEntityManager;
import org.springframework.context.annotation.Import;

import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@Import(QueryDslConfig.class)
class QueueRepositoryTest {

    @Autowired
    private QueueRepository queueRepository;

    @Autowired
    private TestEntityManager entityManager;

    private User persistUser() {
        User user = User.builder().username("user-" + UUID.randomUUID()).build();
        return entityManager.persistAndFlush(user);
    }

    private WaitingQueue persistQueue(User user, Integer concertSessionId, Integer queueNumber, QueueStatus status) {
        WaitingQueue queue = WaitingQueue.builder()
                .user(user)
                .concertSessionId(concertSessionId)
                .queueNumber(queueNumber)
                .status(status)
                .build();
        return entityManager.persistAndFlush(queue);
    }

    @Test
    void findMaxQueueNumber_해당_회차의_최대값을_반환한다() {
        User user = persistUser();
        persistQueue(user, 10, 1, QueueStatus.WAITING);
        persistQueue(user, 10, 2, QueueStatus.WAITING);
        persistQueue(user, 20, 99, QueueStatus.WAITING);

        Integer max = queueRepository.findMaxQueueNumber(10);

        assertThat(max).isEqualTo(2);
    }

    @Test
    void findMaxQueueNumber_데이터가_없으면_0을_반환한다() {
        Integer max = queueRepository.findMaxQueueNumber(999);

        assertThat(max).isEqualTo(0);
    }

    @Test
    void countWaitingAhead_내_순번보다_앞선_WAITING_인원만_센다() {
        User user = persistUser();
        persistQueue(user, 10, 1, QueueStatus.WAITING);
        persistQueue(user, 10, 2, QueueStatus.WAITING);
        persistQueue(user, 10, 3, QueueStatus.READY);
        persistQueue(user, 10, 4, QueueStatus.WAITING);

        long ahead = queueRepository.countWaitingAhead(10, 4);

        assertThat(ahead).isEqualTo(2);
    }

    @Test
    void countTotalWaiting_전체_WAITING_상태만_센다() {
        User user = persistUser();
        persistQueue(user, 10, 1, QueueStatus.WAITING);
        persistQueue(user, 20, 1, QueueStatus.WAITING);
        persistQueue(user, 30, 1, QueueStatus.READY);
        persistQueue(user, 30, 2, QueueStatus.EXPIRED);

        long total = queueRepository.countTotalWaiting();

        assertThat(total).isEqualTo(2);
    }

    @Test
    void countActiveConcertSessions_WAITING이_존재하는_회차_수를_센다() {
        User user = persistUser();
        persistQueue(user, 10, 1, QueueStatus.WAITING);
        persistQueue(user, 10, 2, QueueStatus.WAITING);
        persistQueue(user, 20, 1, QueueStatus.WAITING);
        persistQueue(user, 30, 1, QueueStatus.READY);

        long activeSessions = queueRepository.countActiveConcertSessions();

        assertThat(activeSessions).isEqualTo(2);
    }

    @Test
    void findWaitingCountsBySession_회차별로_그룹화된_대기인원을_반환한다() {
        User user = persistUser();
        persistQueue(user, 10, 1, QueueStatus.WAITING);
        persistQueue(user, 10, 2, QueueStatus.WAITING);
        persistQueue(user, 10, 3, QueueStatus.WAITING);
        persistQueue(user, 20, 1, QueueStatus.WAITING);
        persistQueue(user, 30, 1, QueueStatus.READY);

        List<QueueWaitingCountProjection> result = queueRepository.findWaitingCountsBySession();

        assertThat(result).hasSize(2);
        assertThat(result)
                .extracting(QueueWaitingCountProjection::getConcertSessionId, QueueWaitingCountProjection::getWaitingCount)
                .containsExactlyInAnyOrder(
                        org.assertj.core.groups.Tuple.tuple(10, 3L),
                        org.assertj.core.groups.Tuple.tuple(20, 1L)
                );
    }

    @Test
    void findByStatusAndTokenExpiresAtBefore_만료시간이_지난_READY만_조회한다() {
        User user = persistUser();
        Timestamp past = Timestamp.valueOf(LocalDateTime.now().minusMinutes(5));
        Timestamp future = Timestamp.valueOf(LocalDateTime.now().plusMinutes(5));

        WaitingQueue expired = persistQueue(user, 10, 1, QueueStatus.READY);
        expired.setTokenExpiresAt(past);
        entityManager.persistAndFlush(expired);

        WaitingQueue notExpiredYet = persistQueue(user, 10, 2, QueueStatus.READY);
        notExpiredYet.setTokenExpiresAt(future);
        entityManager.persistAndFlush(notExpiredYet);

        List<WaitingQueue> result = queueRepository.findByStatusAndTokenExpiresAtBefore(
                QueueStatus.READY, Timestamp.valueOf(LocalDateTime.now()));

        assertThat(result).extracting(WaitingQueue::getId).containsExactly(expired.getId());
    }

    @Test
    void findByConcertSessionIdAndUser_IdAndStatusIn_활성상태만_조회한다() {
        User user = persistUser();
        persistQueue(user, 10, 1, QueueStatus.EXPIRED);
        WaitingQueue active = persistQueue(user, 10, 2, QueueStatus.WAITING);

        Optional<WaitingQueue> result = queueRepository.findByConcertSessionIdAndUser_IdAndStatusIn(
                10, user.getId(), List.of(QueueStatus.WAITING, QueueStatus.READY));

        assertThat(result).isPresent();
        assertThat(result.get().getId()).isEqualTo(active.getId());
    }
}