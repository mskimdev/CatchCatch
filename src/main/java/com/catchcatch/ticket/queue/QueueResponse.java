package com.catchcatch.ticket.queue;

public class QueueResponse {

    public record StatusDTO(
            Integer queueId,
            QueueStatus status,
            Integer queueNumber,
            long waitingAhead,
            String entryToken
    ){
        public static StatusDTO of(WaitingQueue queue, long waitingAhead){
            return new StatusDTO(
                    queue.getId(),
                    queue.getStatus(),
                    queue.getQueueNumber(),
                    waitingAhead,
                    queue.getStatus() == QueueStatus.READY ? queue.getEntryToken() : null
            );
        }
    }
}
