package com.catchcatch.ticket.booking;

import lombok.Getter;
import lombok.Setter;

public class BookingRequest {

    @Getter
    @Setter
    public static class SaveDTO {
        private Integer userId;
        private Integer concertSessionId;
        private Integer seatId;
    }

    @Getter
    @Setter
    public static class UpdateStatusDTO {
        private Status status;
    }
}