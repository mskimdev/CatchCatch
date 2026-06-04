package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.core.errors.BadRequestException;
import lombok.Getter;
import lombok.Setter;

import java.util.Arrays;

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

    @Getter
    @Setter
    public static class PaymentStartDTO {
        private String seatIds;

        public void validate() {
            validateRequiredText(seatIds, "좌석을 선택해주세요.");

            String[] seatIdArray = Arrays.stream(seatIds.split(","))
                    .map(String::trim)
                    .filter(seatId -> !seatId.isBlank())
                    .toArray(String[]::new);

            if (seatIdArray.length == 0) {
                throw new BadRequestException("좌석을 선택해주세요.");
            }

            if (seatIdArray.length > MAX_SEAT_COUNT) {
                throw new BadRequestException("좌석은 최대 4석까지 선택할 수 있습니다.");
            }

            for (String seatId : seatIdArray) {
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
    public static class PaymentConfirmDTO {
        private Integer bookingId;
        private String merchantUid;
        private Integer amount;
        private String method;

        public void validate() {
            validateRequired(bookingId, "예매 정보가 없습니다.");
            validateRequiredText(merchantUid, "주문 번호가 없습니다.");
            validatePositiveAmount(amount);
            validateRequiredText(method, "결제 수단을 선택해주세요.");
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

    private static void validatePositiveAmount(Integer amount) {
        if (amount == null || amount <= 0) {
            throw new BadRequestException("결제 금액이 올바르지 않습니다.");
        }
    }
}