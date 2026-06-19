package com.catchcatch.ticket.queue;

public interface QueueWaitingCountProjection {
    Integer getConcertSessionId();
    String getConcertTitle();
    String getRound();
    Long getWaitingCount();
}
