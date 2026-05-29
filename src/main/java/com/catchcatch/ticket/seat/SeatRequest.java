package com.catchcatch.ticket.seat;

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
}