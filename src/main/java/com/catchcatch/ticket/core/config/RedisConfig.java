package com.catchcatch.ticket.core.config;

import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import redis.embedded.RedisServer;

import java.io.IOException;

// 로컬/개발 환경에서 별도 Redis 설치 없이 앱 기동 시 같은 JVM 안에서 Redis를 띄운다.
// 운영 환경(prod 등)에서는 이 설정이 활성화되지 않고 실제 Redis 서버에 연결해야 한다.
@Slf4j
@Configuration
@Profile({"local", "dev"})
public class RedisConfig {

    @Value("${spring.data.redis.port:6379}")
    private int redisPort;

    private RedisServer redisServer;

    @PostConstruct
    public void startRedis() throws IOException {
        redisServer = new RedisServer(redisPort);
        redisServer.start();
        log.info("[Embedded Redis] 내장 Redis 서버 시작 (port={})", redisPort);
    }

    @PreDestroy
    public void stopRedis() throws IOException {
        if (redisServer != null) {
            redisServer.stop();
            log.info("[Embedded Redis] 내장 Redis 서버 종료");
        }
    }
}
