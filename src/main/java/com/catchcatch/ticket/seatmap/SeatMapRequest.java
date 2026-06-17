package com.catchcatch.ticket.seatmap;

import lombok.Getter;
import lombok.Setter;


public class SeatMapRequest {

    @Getter
    @Setter
    public static class SaveDTO {
        private String fileName;
        private String json;
    }
}
