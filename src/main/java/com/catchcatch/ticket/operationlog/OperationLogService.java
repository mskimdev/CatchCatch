package com.catchcatch.ticket.operationlog;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class OperationLogService {

    private static final int RECENT_LOG_LIMIT = 20;

    private final OperationLogRepository operationLogRepository;

    @Transactional
    public void log(OperationLogLevel level, String actor, String message) {
        OperationLog operationLog = OperationLog.builder()
                .level(level)
                .actor(actor)
                .message(message)
                .build();

        operationLogRepository.save(operationLog);
    }

    @Transactional(readOnly = true)
    public List<OperationLog> findRecentLogs() {
        return operationLogRepository.findAllByOrderByCreatedAtDesc(PageRequest.of(0, RECENT_LOG_LIMIT));
    }
}