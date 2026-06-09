package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.core.errors.BadRequestException;
import lombok.Getter;
import lombok.Setter;

public class BookingRequest {

    private static final int MAX_SEAT_COUNT = 4;

    @Getter
    @Setter
    public static class StartDTO {
        private Integer concertId;
        private Integer sessionId;

        public void validate() {
            validateRequired(concertId, "공연 정보가 없습니다.");
            validateRequired(sessionId, "공연 회차 정보가 없습니다.");
        }
    }

    @Getter
    @Setter
    public static class SaveDTO {
        private Integer userId;
        private Integer concertSessionId;
        private Integer seatId;

        public void validate() {
            validateRequired(userId, "사용자 정보가 없습니다.");
            validateRequired(concertSessionId, "공연 회차 정보가 없습니다.");
            validateRequired(seatId, "좌석 정보가 없습니다.");
        }
    }

    // 좌석 선택 후 결제 담당 화면으로 넘기기 위한 DTO
    @Getter
    @Setter
    public static class SeatSelectDTO {
        private String seatIds;

        public void validate() {
            validateRequiredText(seatIds, "좌석을 선택해주세요.");

            String[] seatIdArray = seatIds.split(",");

            if (seatIdArray.length > MAX_SEAT_COUNT) {
                throw new BadRequestException("좌석은 최대 4석까지 선택할 수 있습니다.");
            }

            for (String seatId : seatIdArray) {
                seatId = seatId.trim();

                if (seatId.isBlank()) {
                    throw new BadRequestException("좌석 정보가 올바르지 않습니다.");
                }

                validateSeatId(seatId);
            }
        }

        private void validateSeatId(String seatId) {
            try {
                Integer.parseInt(seatId);
            } catch (NumberFormatException e) {
                throw new BadRequestException("좌석 정보가 올바르지 않습니다.");
            }
        }
    }

    @Getter
    @Setter
    public static class UpdateStatusDTO {
        private Status status;

        public void validate() {
            validateRequired(status, "변경할 예매 상태가 없습니다.");
        }
    }

    private static void validateRequired(Object value, String message) {
        if (value == null) {
            throw new BadRequestException(message);
        }
    }

    private static void validateRequiredText(String value, String message) {
        if (value == null || value.isBlank()) {
            throw new BadRequestException(message);
        }
    }
}