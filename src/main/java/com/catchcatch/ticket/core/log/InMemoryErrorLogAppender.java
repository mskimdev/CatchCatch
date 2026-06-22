package com.catchcatch.ticket.core.log;

import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.AppenderBase;

import java.sql.Timestamp;
import java.util.Deque;
import java.util.List;
import java.util.concurrent.ConcurrentLinkedDeque;

// Logback의 ERROR/WARN 로그를 가로채 메모리에만 보관하는 Appender.
// DB에 쓰지 않으므로 서버를 재시작하면 사라진다.
public class InMemoryErrorLogAppender extends AppenderBase<ILoggingEvent> {

    private static final int MAX_SIZE = 50;
    private static final Deque<ErrorLogEntry> BUFFER = new ConcurrentLinkedDeque<>();

    @Override
    protected void append(ILoggingEvent event) {
        BUFFER.addFirst(new ErrorLogEntry(
                event.getLevel().toString(),
                event.getFormattedMessage(),
                new Timestamp(event.getTimeStamp())
        ));

        while (BUFFER.size() > MAX_SIZE) {
            BUFFER.removeLast();
        }
    }

    public static List<ErrorLogEntry> recentLogs() {
        return List.copyOf(BUFFER);
    }

    public static long countSince(Timestamp since) {
        return BUFFER.stream().filter(e -> e.occurredAt().after(since)).count();
    }

    public record ErrorLogEntry(String level, String message, Timestamp occurredAt) {
    }
}