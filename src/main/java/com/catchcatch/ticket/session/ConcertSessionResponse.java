package com.catchcatch.ticket.session;

import lombok.Getter;

import java.time.LocalTime;

public class ConcertSessionResponse {

    @Getter
    public static class TimeDTO {

        private Integer sessionId;
        private LocalTime sessionTime;
        private Long totalSeatCount;
        private Long remainingSeatCount;
        private Boolean soldOut;

        public TimeDTO(
                Integer sessionId,
                LocalTime sessionTime,
                Long totalSeatCount,
                Long remainingSeatCount,
                Boolean soldOut
        ) {
            this.sessionId = sessionId;
            this.sessionTime = sessionTime;
            this.totalSeatCount = totalSeatCount;
            this.remainingSeatCount = remainingSeatCount;
            this.soldOut = soldOut;
        }
    }
}