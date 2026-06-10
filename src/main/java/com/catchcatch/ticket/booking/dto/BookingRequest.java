package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.core.errors.BadRequestException;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.Arrays;
import java.util.List;

public class BookingRequest {

    private static final int MAX_SEAT_COUNT = 4;

    /**
     * 예매 시작 DTO
     * 공연 상세에서 예매하기 눌렀을 때 사용
     */
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

    /**
     * 실제 예매 생성 DTO
     *
     * 좌석 선택 후 다음 단계 클릭 시
     * Booking + BookingSeat 생성에 사용
     */
    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SaveDTO {
        private Integer userId;
        private Integer sessionId;
        private List<Integer> seatIds;

        public void validate() {
            validateRequired(userId, "사용자 정보가 없습니다.");
            validateRequired(sessionId, "공연 회차 정보가 없습니다.");
            validateSeatIds(seatIds);
        }
    }

    /**
     * 좌석 선택 후 결제 화면으로 넘기기 위한 DTO
     *
     * seatIds는 hidden input에서 "1,2,3" 형태로 넘어온다.
     */
    @Getter
    @Setter
    public static class SeatSelectDTO {
        private Integer sessionId;
        private String seatIds;

        public void validate() {
            validateRequired(sessionId, "공연 회차 정보가 없습니다.");

            List<Integer> parsedSeatIds = getSeatIdList();
            validateSeatIds(parsedSeatIds);
        }

        public List<Integer> getSeatIdList() {
            validateRequiredText(seatIds, "선택된 좌석이 없습니다.");

            try {
                return Arrays.stream(seatIds.split(","))
                        .map(String::trim)
                        .filter(value -> !value.isBlank())
                        .map(Integer::valueOf)
                        .distinct()
                        .toList();
            } catch (NumberFormatException e) {
                throw new BadRequestException("좌석 정보가 올바르지 않습니다.");
            }
        }
    }

    /**
     * 예매 상태 변경 DTO
     */
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

    private static void validateSeatIds(List<Integer> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            throw new BadRequestException("선택된 좌석이 없습니다.");
        }

        if (seatIds.size() > MAX_SEAT_COUNT) {
            throw new BadRequestException("좌석은 최대 " + MAX_SEAT_COUNT + "개까지 선택할 수 있습니다.");
        }

        boolean hasInvalidSeatId = seatIds.stream()
                .anyMatch(seatId -> seatId == null || seatId <= 0);

        if (hasInvalidSeatId) {
            throw new BadRequestException("좌석 정보가 올바르지 않습니다.");
        }
    }
}