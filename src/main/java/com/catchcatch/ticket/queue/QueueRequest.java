package com.catchcatch.ticket.queue;

import jakarta.validation.constraints.NotNull;

public class QueueRequest {

    public record EnterDTO(
            @NotNull(message = "공연 회차 정보가 없습니다.")
            Integer concertSessionId){
    }
}
