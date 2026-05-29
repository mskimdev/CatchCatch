package com.catchcatch.ticket.seat;

import lombok.Getter;

public class SeatResponse {

    @Getter
    public static class SeatDTO {

        private Integer id;
        private Integer sessionId;
        private String seatNumber;
        private SeatGrade grade;
        private Integer price;
        private SeatStatus status;
        private Boolean selectable;

        public SeatDTO(Seat seat) {
            this.id = seat.getId();
            this.sessionId = seat.getSessionId();
            this.seatNumber = seat.getSeatNumber();
            this.grade = seat.getGrade();
            this.price = seat.getPrice();
            this.status = seat.getStatus();
            this.selectable = seat.getStatus() == SeatStatus.AVAILABLE;
        }
    }

    @Getter
    public static class SummaryDTO {

        private Long totalSeatCount;
        private Long availableSeatCount;
        private Long heldSeatCount;
        private Long soldSeatCount;
        private Boolean soldOut;

        public SummaryDTO(
                Long totalSeatCount,
                Long availableSeatCount,
                Long heldSeatCount,
                Long soldSeatCount
        ) {
            this.totalSeatCount = totalSeatCount;
            this.availableSeatCount = availableSeatCount;
            this.heldSeatCount = heldSeatCount;
            this.soldSeatCount = soldSeatCount;
            this.soldOut = availableSeatCount == 0;
        }
    }
}