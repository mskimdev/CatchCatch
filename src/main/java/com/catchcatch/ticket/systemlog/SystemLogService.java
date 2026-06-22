package com.catchcatch.ticket.systemlog;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SystemLogService {

    private static final int RECENT_LOG_LIMIT = 20;

    private final SystemLogRepository systemLogRepository;

    @Transactional
    public void log(SystemLogLevel level, String actor, String message) {
        SystemLog systemLog = SystemLog.builder()
                .level(level)
                .actor(actor)
                .message(message)
                .build();

        systemLogRepository.save(systemLog);
    }

    @Transactional(readOnly = true)
    public List<SystemLog> findRecentLogs() {
        return systemLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, RECENT_LOG_LIMIT));
    }
}