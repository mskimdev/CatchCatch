package com.catchcatch.ticket.queue;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.data.redis.listener.PatternTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class QueueKeyExpirationListener implements MessageListener {

    private static final String READY_KEY_PREFIX = "queue:ready:";
    private static final String ENTERED_KEY_PREFIX = "queue:entered:";

    private final RedisMessageListenerContainer listenerContainer;
    private final QueueService queueService;

    @PostConstruct
    public void subscribe(){
        // db 0 기준 만료 이벤트 채널. RedisConfig에서 notify-keyspace-events=Ex로 설정 해둔 걸 구독
        listenerContainer.addMessageListener(this, new PatternTopic("__keyevent@0__:expired"));
    }

    @Override
    public void onMessage(Message message, byte[] pattern){
        String expiredKey = message.toString();

        if (expiredKey.startsWith(READY_KEY_PREFIX)) {
            // queue:ready:{sessionId}:{userId}
            String[] parts = expiredKey.substring(READY_KEY_PREFIX.length()).split(":");
            Integer sessionId = Integer.parseInt(parts[0]);
            Integer userId = Integer.parseInt(parts[1]);
            log.info("[Queue] READY 만료 감지 - sessionId: {}, userId: {}", sessionId, userId);
            queueService.onReadyExpired(sessionId, userId);

        } else if (expiredKey.startsWith(ENTERED_KEY_PREFIX)) {
            // queue:entered:{sessionId}:{userId}
            String[] parts = expiredKey.substring(ENTERED_KEY_PREFIX.length()).split(":");
            Integer sessionId = Integer.parseInt(parts[0]);
            Integer userId = Integer.parseInt(parts[1]);
            log.info("[Queue] ENTERED 만료 감지 (결제 미완료) - sessionId: {}, userId: {}", sessionId, userId);
            queueService.onEnteredExpired(sessionId, userId);
        }
    }
}
