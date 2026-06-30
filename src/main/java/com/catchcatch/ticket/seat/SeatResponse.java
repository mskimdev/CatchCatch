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
        private Boolean soldOut;

        public SeatDTO(Seat seat) {
            this.id = seat.getId();
            this.sessionId = seat.getSessionId();
            this.seatNumber = seat.getSeatNumber();
            this.grade = seat.getGrade();
            this.price = seat.getPrice();
            this.status = seat.getStatus();

            this.selectable = seat.getStatus() == SeatStatus.AVAILABLE;
            this.soldOut = seat.getStatus() == SeatStatus.SOLD;
        }
    }

    @Getter
    public static class SummaryDTO {

        private Long totalSeatCount;
        private Long availableSeatCount;
        private Long heldSeatCount;
        private Boolean selectable;

        public SummaryDTO(
                Long totalSeatCount,
                Long availableSeatCount,
                Long heldSeatCount
        ) {
            this.totalSeatCount = totalSeatCount;
            this.availableSeatCount = availableSeatCount;
            this.heldSeatCount = heldSeatCount;
            this.selectable = availableSeatCount > 0;
        }
    }

    @Getter
    public static class GradeSummaryDTO {

        private SeatGrade grade;
        private Long totalSeatCount;
        private Long remainingSeatCount;
        private Long heldSeatCount;
        private Long soldSeatCount;
        private Boolean soldOut;

        public GradeSummaryDTO(
                SeatGrade grade,
                Long totalSeatCount,
                Long remainingSeatCount,
                Long heldSeatCount,
                Long soldSeatCount
        ) {
            this.grade = grade;
            this.totalSeatCount = totalSeatCount;
            this.remainingSeatCount = remainingSeatCount;
            this.heldSeatCount = heldSeatCount;
            this.soldSeatCount = soldSeatCount;
            this.soldOut = remainingSeatCount == 0;
        }
    }
}
