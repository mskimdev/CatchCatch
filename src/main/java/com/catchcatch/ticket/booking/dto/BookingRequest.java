package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.core.exception.BadRequestException;
import jakarta.validation.constraints.NotNull;

import java.util.Arrays;
import java.util.List;

public class BookingRequest {

    private static final int MAX_SEAT_COUNT = 4;

    private BookingRequest() {
    }

    public record StartDTO(
            @NotNull(message = "공연 정보가 없습니다.")
            Integer concertId,

            @NotNull(message = "공연 회차 정보가 없습니다.")
            Integer sessionId
    ) {
        public void validate() {
            validateRequired(concertId, "공연 정보가 없습니다.");
            validateRequired(sessionId, "공연 회차 정보가 없습니다.");
        }
    }

    public record SaveDTO(
            @NotNull(message = "공연 회차 정보가 없습니다.")
            Integer sessionId,

            List<Integer> seatIds
    ) {
        public void validate() {
            validateRequired(sessionId, "공연 회차 정보가 없습니다.");
            validateSeatIds(seatIds);
        }
    }

    public record SeatSelectDTO(
            @NotNull(message = "공연 회차 정보가 없습니다.")
            Integer sessionId,

            String seatIds
    ) {
        public void validate() {
            validateRequired(sessionId, "공연 회차 정보가 없습니다.");
            getSeatIdList();
        }

        public List<Integer> getSeatIdList() {
            validateRequiredText(seatIds, "선택된 좌석이 없습니다.");

            try {
                List<Integer> parsedSeatIds = Arrays.stream(seatIds.split(","))
                        .map(String::trim)
                        .filter(value -> !value.isBlank())
                        .map(Integer::valueOf)
                        .distinct()
                        .toList();

                validateSeatIds(parsedSeatIds);
                return parsedSeatIds;
            } catch (NumberFormatException e) {
                throw new BadRequestException("좌석 정보가 올바르지 않습니다.");
            }
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

        long distinctCount = seatIds.stream()
                .distinct()
                .count();

        if (distinctCount != seatIds.size()) {
            throw new BadRequestException("중복된 좌석 정보가 포함되어 있습니다.");
        }
    }
}
