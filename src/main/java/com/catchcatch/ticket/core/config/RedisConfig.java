package com.catchcatch.ticket.core.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.connection.RedisConnection;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.connection.lettuce.LettuceConnectionFactory;
import redis.embedded.RedisServer;

import java.io.IOException;

@Slf4j
@Configuration
@Profile({"local", "dev"})
public class RedisConfig {

    @Value("${spring.data.redis.host}")
    private String redisHost;

    @Value("${spring.data.redis.port}")
    private int redisPort;

    private RedisServer redisServer;

    @Bean
    public RedisConnectionFactory redisConnectionFactory() {
        return new LettuceConnectionFactory(redisHost, redisPort);
    }

    @PostConstruct
    public void startRedis() throws IOException {
        redisServer = new RedisServer(redisPort);
        redisServer.start();
        log.info("[Embedded Redis] 내장 Redis 서버 시작 (port={})", redisPort);

        enableKeyExpirationNotification();
    }

    // READY 토큰의 TTL 만료를 애플리케이션이 감지하게 keyspace notification을 켬
    // ( E: keyevent로 발행, x: 만료 이벤트만 )
    private void enableKeyExpirationNotification(){
        LettuceConnectionFactory factory = new LettuceConnectionFactory(redisHost, redisPort);
        factory.afterPropertiesSet();

        try(RedisConnection connection = factory.getConnection()) {
            connection.setConfig("notify-keyspace-events", "Ex");
            log.info("[Embedded Redis] notify-keyspace-events=Ex 설정");
        } finally{
            factory.destroy();
        }

    }

    @PreDestroy
    public void stopRedis() throws IOException {
        if (redisServer != null) {
            redisServer.stop();
            log.info("[Embedded Redis] 내장 Redis 서버 종료");
        }
    }
}
