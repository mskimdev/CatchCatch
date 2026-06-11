package com.catchcatch.ticket.session;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalTime;

public class ConcertSessionRequest {

    /*
        회차 추가
     */
    @Getter
    @Setter
    public static class SaveDTO {
        private String round;        // 예: 3회차
        private String sessionDate;  // HTML에서 yyyy-MM-dd 형태로 수신
        private String sessionTime;  // HTML에서 HH:mm 형태로 수신

        public LocalDate toLocalDate() {
            return LocalDate.parse(this.sessionDate);
        }

        public LocalTime toLocalTime() {
            return LocalTime.parse(this.sessionTime);
        }
    }

}
