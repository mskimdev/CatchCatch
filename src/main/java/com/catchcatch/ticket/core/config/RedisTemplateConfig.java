package com.catchcatch.ticket.core.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

// 대기열 등 키/값이 전부 문자열인 도메인에서 사용할 RedisTemplate.
// StringRedisTemplate은 키와 값을 모두 String으로 직렬화해 Redis CLI로 직접 조회해도 읽기 쉽다.
@Configuration
public class RedisTemplateConfig {

    @Bean
    public StringRedisTemplate stringRedisTemplate(RedisConnectionFactory connectionFactory) {
        return new StringRedisTemplate(connectionFactory);
    }


    // keyspace notification을 구독하기 위한 Pub/Sub 리스너 컨테이너
    @Bean
    public RedisMessageListenerContainer redisMessageListenerContainer(RedisConnectionFactory connectionFactory) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        return container;
    }
}
