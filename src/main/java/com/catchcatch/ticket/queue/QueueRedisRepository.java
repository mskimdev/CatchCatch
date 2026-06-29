package com.catchcatch.ticket.queue;

import lombok.RequiredArgsConstructor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ZSetOperations;
import org.springframework.stereotype.Repository;

import java.time.Duration;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

// QueueService가 사용할 저차원 Redis 연산을 모아둔다.
// JPA Repository를 대체하는 역할이며, 이 클래스만 Redis 키 구조를 직접 알고 있다.
@Repository
@RequiredArgsConstructor
public class QueueRedisRepository {

    private final StringRedisTemplate redisTemplate;

    // ---------- WAITING ----------

    // 새 대기 순번을 발급하고 WAITING ZSET에 추가한다. 반환값이 큐 넘버(score)다.
    public long enqueueWaiting(Integer sessionId, Integer userId) {
        Long queueNumber = redisTemplate.opsForValue().increment(QueueRedisKeys.sequence(sessionId));
        redisTemplate.opsForZSet().add(QueueRedisKeys.waiting(sessionId), userId.toString(), queueNumber);
        redisTemplate.opsForSet().add(QueueRedisKeys.activeSessions(), sessionId.toString());
        return queueNumber;
    }

    // 이미 대기열/READY/ENTERED 상태인지 확인 (중복 입장 방지용)
    public boolean isWaiting(Integer sessionId, Integer userId) {
        Double score = redisTemplate.opsForZSet().score(QueueRedisKeys.waiting(sessionId), userId.toString());
        return score != null;
    }

    // 내 순번(score)보다 앞에 있는 대기자 수
    public long countWaitingAhead(Integer sessionId, long myQueueNumber) {
        Long count = redisTemplate.opsForZSet()
                .count(QueueRedisKeys.waiting(sessionId), Double.NEGATIVE_INFINITY, myQueueNumber - 1);
        return count == null ? 0 : count;
    }

    // 내 큐 넘버(score) 조회
    public Optional<Long> getQueueNumber(Integer sessionId, Integer userId) {
        Double score = redisTemplate.opsForZSet().score(QueueRedisKeys.waiting(sessionId), userId.toString());
        return score == null ? Optional.empty() : Optional.of(score.longValue());
    }

    // WAITING 앞쪽에서 최대 count명을 꺼낸다 (승격 대상). 비어있으면 빈 Set.
    public Set<ZSetOperations.TypedTuple<String>> popFrontWaiting(Integer sessionId, long count) {
        Set<ZSetOperations.TypedTuple<String>> popped =
                redisTemplate.opsForZSet().popMin(QueueRedisKeys.waiting(sessionId), count);
        return popped == null ? Set.of() : popped;
    }

    // 현재 WAITING 인원이 있는 회차 ID 목록
    public Set<String> findActiveSessionIds() {
        return redisTemplate.opsForSet().members(QueueRedisKeys.activeSessions());
    }

    // WAITING/READY/ENTERED가 모두 비어야 active-sessions에서 제거한다.
    // (어드민 대시보드가 ENTERED까지 빠져나가는 과정을 끝까지 보여줄 수 있어야 하므로,
    //  WAITING만 0이 됐다고 바로 빼면 안 된다.)
    public void removeFromActiveSessionsIfEmpty(Integer sessionId) {
        long waitingSize = countWaitingBySession(sessionId);
        long readySize = countReadyBySession(sessionId);
        long enteredSize = countEnteredBySession(sessionId);

        if (waitingSize == 0 && readySize == 0 && enteredSize == 0) {
            redisTemplate.opsForSet().remove(QueueRedisKeys.activeSessions(), sessionId.toString());
        }
    }

    public long countTotalWaiting() {
        Set<String> sessionIds = findActiveSessionIds();
        return sessionIds.stream()
                .mapToLong(id -> {
                    Long size = redisTemplate.opsForZSet().size(QueueRedisKeys.waiting(Integer.parseInt(id)));
                    return size == null ? 0 : size;
                })
                .sum();
    }

    public long countWaitingBySession(Integer sessionId) {
        Long size = redisTemplate.opsForZSet().size(QueueRedisKeys.waiting(sessionId));
        return size == null ? 0 : size;
    }

    // ---------- READY ----------

    // WAITING에서 꺼낸 유저를 READY로 승격하고 입장 토큰을 발급한다 (TTL=ttl 이후 자동 만료)
    public String promoteToReady(Integer sessionId, Integer userId, Duration ttl) {
        String entryToken = sessionId + "-" + userId + "-" + System.nanoTime();

        redisTemplate.opsForValue().set(QueueRedisKeys.ready(sessionId, userId), entryToken, ttl);
        redisTemplate.opsForValue().set(QueueRedisKeys.tokenLookup(entryToken), sessionId + ":" + userId, ttl);
        redisTemplate.opsForSet().add(QueueRedisKeys.readySet(sessionId), userId.toString());

        return entryToken;
    }

    public boolean isReady(Integer sessionId, Integer userId) {
        return redisTemplate.hasKey(QueueRedisKeys.ready(sessionId, userId));
    }

    // ready 키가 TTL로 자연 만료된 경우를 정리한다. 스케줄러(안전망)가 주기적으로 호출.
    // readySet은 TTL을 못 걸기 때문에, 실제 ready 키가 살아있는지 직접 검증해 정리한다.
    public void pruneExpiredReady(Integer sessionId) {
        Set<String> userIds = redisTemplate.opsForSet().members(QueueRedisKeys.readySet(sessionId));
        if (userIds == null) return;

        for (String userId : userIds) {
            if (!isReady(sessionId, Integer.parseInt(userId))) {
                redisTemplate.opsForSet().remove(QueueRedisKeys.readySet(sessionId), userId);
            }
        }
    }

    public Optional<String> getReadyToken(Integer sessionId, Integer userId) {
        return Optional.ofNullable(redisTemplate.opsForValue().get(QueueRedisKeys.ready(sessionId, userId)));
    }

    // entryToken으로 "sessionId:userId"를 역으로 찾는다.
    public Optional<int[]> resolveToken(String entryToken) {
        String value = redisTemplate.opsForValue().get(QueueRedisKeys.tokenLookup(entryToken));
        if (value == null) {
            return Optional.empty();
        }
        String[] parts = value.split(":");
        return Optional.of(new int[]{Integer.parseInt(parts[0]), Integer.parseInt(parts[1])});
    }

    // READY 상태 해제 (ENTERED로 전환할 때 또는 만료 처리할 때 호출)
    public void clearReady(Integer sessionId, Integer userId, String entryToken) {
        redisTemplate.delete(QueueRedisKeys.ready(sessionId, userId));
        redisTemplate.opsForSet().remove(QueueRedisKeys.readySet(sessionId), userId.toString());
        if (entryToken != null) {
            redisTemplate.delete(QueueRedisKeys.tokenLookup(entryToken));
        }
    }

    public long countReadyBySession(Integer sessionId) {
        Long size = redisTemplate.opsForSet().size(QueueRedisKeys.readySet(sessionId));
        return size == null ? 0 : size;
    }

    // ---------- ENTERED ----------

    // ENTERED 개별 키에 TTL을 걸어 결제 타임아웃 후 자동 해제되도록 한다.
    public void markEntered(Integer sessionId, Integer userId, Duration ttl) {
        redisTemplate.opsForValue().set(QueueRedisKeys.entered(sessionId, userId), "1", ttl);
        redisTemplate.opsForSet().add(QueueRedisKeys.enteredSet(sessionId), userId.toString());
    }

    public boolean isEntered(Integer sessionId, Integer userId) {
        return Boolean.TRUE.equals(redisTemplate.hasKey(QueueRedisKeys.entered(sessionId, userId)));
    }

    // 결제완료/취소/만료로 예매 프로세스를 빠져나갈 때 ENTERED 상태를 해제한다.
    public void clearEntered(Integer sessionId, Integer userId) {
        redisTemplate.delete(QueueRedisKeys.entered(sessionId, userId));
        redisTemplate.opsForSet().remove(QueueRedisKeys.enteredSet(sessionId), userId.toString());
    }

    // enteredSet에 남아있지만 TTL 만료된 항목을 정리한다. 스케줄러(안전망)가 주기적으로 호출.
    public void pruneExpiredEntered(Integer sessionId) {
        Set<String> userIds = redisTemplate.opsForSet().members(QueueRedisKeys.enteredSet(sessionId));
        if (userIds == null) return;
        for (String userId : userIds) {
            if (!isEntered(sessionId, Integer.parseInt(userId))) {
                redisTemplate.opsForSet().remove(QueueRedisKeys.enteredSet(sessionId), userId);
            }
        }
    }

    // READY + ENTERED 합산 (스케줄러의 capacity 계산용)
    public long countActiveBySession(Integer sessionId) {
        return countReadyBySession(sessionId) + countEnteredBySession(sessionId);
    }

    public long countEnteredBySession(Integer sessionId) {
        // enteredSet에서 실제 살아있는 키만 집계
        Set<String> userIds = redisTemplate.opsForSet().members(QueueRedisKeys.enteredSet(sessionId));
        if (userIds == null || userIds.isEmpty()) return 0;
        return userIds.stream()
                .filter(uid -> isEntered(sessionId, Integer.parseInt(uid)))
                .count();
    }
}
