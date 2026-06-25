package com.catchcatch.ticket.seatmap;

import lombok.Getter;
import lombok.Setter;


public class SeatMapRequest {

    @Getter
    @Setter
    public static class TempSaveDTO {
        private String page;
        private String seatJsonText;
        private String sectionJsonText;
        private String imageDataUrl;
    }

    @Getter
    @Setter
    public static class OverwriteSaveDTO {
        private String imageDataUrl;
        private String jsonText;
    }
}
