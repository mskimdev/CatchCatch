package com.catchcatch.ticket.queue;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.sql.Timestamp;
import java.util.List;
import java.util.Optional;

public interface QueueRepository extends JpaRepository<WaitingQueue, Integer> {
    @Query("select coalesce(max(w.queueNumber), 0) from WaitingQueue w where w.concertSessionId = :sessionId")
    Integer findMaxQueueNumber(@Param("sessionId") Integer sessionId);

    Optional<WaitingQueue> findByConcertSessionIdAndUser_IdAndStatusIn(Integer concertSessionId, Integer userId, List<QueueStatus> statuses);

    @Query("""
            select count(w) from WaitingQueue w
            where w.concertSessionId = :sessionId
            and w.status = 'WAITING'
            and w.queueNumber < :myQueueNumber
            """)
    long countWaitingAhead(@Param("sessionId") Integer sessionId, @Param("myQueueNumber") Integer myQueueNumber);

    List<WaitingQueue> findByConcertSessionIdAndStatusOrderByQueueNumberAsc(Integer concertSessionId, QueueStatus status);

    List<WaitingQueue> findByStatusAndTokenExpiresAtBefore(QueueStatus status, Timestamp now);

    Optional<WaitingQueue> findByEntryToken(String entryToken);

    @Query("select distinct w.concertSessionId from WaitingQueue w where w.status = 'WAITING'")
    List<Integer> findDistinctWaitingConcertSessionIds();

}
