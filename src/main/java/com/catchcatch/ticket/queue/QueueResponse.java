package com.catchcatch.ticket.queue;

public class QueueResponse {

    public record StatusDTO(
            Integer concertSessionId,
            QueueStatus status,
            Long queueNumber,
            long waitingAhead,
            long waitingBehind,
            String entryToken
    ){}
}
