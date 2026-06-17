package com.catchcatch.ticket.seat;

import lombok.Data;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.util.List;

public class SeatRequest {

    @Getter
    @NoArgsConstructor
    public static class HoldDTO {

        private List<Integer> seatIds;

        public HoldDTO(List<Integer> seatIds) {
            this.seatIds = seatIds;
        }
    }

    // 좌석 jsonDTO
    @Data
    @NoArgsConstructor
    public static class SeatJsonDTO{
        private String id;
        private String grade;
        private String status;
    }
}