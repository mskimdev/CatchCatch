package com.catchcatch.ticket.queue;

// Redis 대기열 키 네이밍을 한 곳에 모아둔다.
final class QueueRedisKeys {

    private QueueRedisKeys() {
    }

    // WAITING 대기자 목록 (ZSET, member=userId, score=대기 순번)
    static String waiting(Integer sessionId) {
        return "queue:waiting:" + sessionId;
    }

    // 회차별 대기 순번 발급 카운터 (INCR로 증가)
    static String sequence(Integer sessionId) {
        return "queue:seq:" + sessionId;
    }

    // READY 입장 토큰 (TTL 만료 = 자동 EXPIRED)
    static String ready(Integer sessionId, Integer userId) {
        return "queue:ready:" + sessionId + ":" + userId;
    }

    // 현재 READY 상태인 유저 목록 (SET) - 개수 집계용. ready() 키와 함께 갱신/삭제한다.
    static String readySet(Integer sessionId) {
        return "queue:ready-set:" + sessionId;
    }

    // entryToken -> "sessionId:userId" 역방향 조회용
    static String tokenLookup(String entryToken) {
        return "queue:token:" + entryToken;
    }

    // ENTERED 개별 키 (TTL 만료 = 자동 해제)
    static String entered(Integer sessionId, Integer userId) {
        return "queue:entered:" + sessionId + ":" + userId;
    }

    // 현재 ENTERED 상태인 유저 목록 (SET) - 개수 집계용. entered() 키와 함께 갱신/삭제한다.
    static String enteredSet(Integer sessionId) {
        return "queue:entered-set:" + sessionId;
    }

    // 대기자가 1명 이상 존재했던 회차 목록 (SET) - 스케줄러가 순회할 대상
    static String activeSessions() {
        return "queue:active-sessions";
    }
}
