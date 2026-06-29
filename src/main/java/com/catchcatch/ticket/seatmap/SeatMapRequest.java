package com.catchcatch.ticket.seatmap;

import lombok.Getter;
import lombok.Setter;

public class SeatMapRequest {

    @Getter
    @Setter
    public static class ProjectCreateDTO {
        private String projectName;
        private String folderName;
        private String sourceFileName;
        private String imageDataUrl;
    }

    @Getter
    @Setter
    public static class TempSaveDTO {
        private String page;
        private String folderName;
        private String seatJsonText;
        private String sectionJsonText;
        private String imageDataUrl;
    }

    @Getter
    @Setter
    public static class ProjectDeleteDTO {
        private String folderName;
    }

    @Getter
    @Setter
    public static class OverwriteSaveDTO {
        private String folderName;
        private String imageDataUrl;
        private String jsonText;
    }
}
