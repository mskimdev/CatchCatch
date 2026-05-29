package com.catchcatch.ticket.session;

import lombok.Getter;

import java.time.LocalTime;

public class ConcertSessionResponse {

    @Getter
    public static class TimeDTO {

        private Integer sessionId;
        private LocalTime sessionTime;
        private Long remainingSeatCount;
        private Boolean soldOut;
        private String remainingDisplay;

        public TimeDTO(
                Integer sessionId,
                LocalTime sessionTime,
                Long remainingSeatCount,
                Boolean soldOut,
                String remainingDisplay
        ) {
            this.sessionId = sessionId;
            this.sessionTime = sessionTime;
            this.remainingSeatCount = remainingSeatCount;
            this.soldOut = soldOut;
            this.remainingDisplay = remainingDisplay;
        }
    }
}