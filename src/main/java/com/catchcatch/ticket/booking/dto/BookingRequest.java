package com.catchcatch.ticket.booking.dto;

import com.catchcatch.ticket.booking.Status;
import com.catchcatch.ticket.core.errors.BadRequestException;
import lombok.Getter;
import lombok.Setter;

public class BookingRequest {

    // 예매 시작 요청 DTO
    // concert/detail 화면에서 예매하기 버튼 누를 때 사용
    @Getter
    @Setter
    public static class StartDTO {
        private Integer concertId;
        private Integer sessionId;

        public void validate() {
            if (concertId == null) {
                throw new BadRequestException("공연 정보가 없습니다.");
            }
            if (sessionId == null) {
                throw new BadRequestException("공연 회차 정보가 없습니다.");
            }
        }
    }

    // 예매 저장 요청 DTO
    // userId는 세션에서 꺼내야 하므로 DTO에 넣지 않는 것을 추천
    @Getter
    @Setter
    public static class SaveDTO {
        private Integer concertSessionId;
        private Integer seatId;
        private String userId;

        public void validate() {
            if (concertSessionId == null) {
                throw new BadRequestException("공연 회차 정보가 없습니다.");
            }
            if (seatId == null) {
                throw new BadRequestException("좌석 정보가 없습니다.");
            }
        }

        public void setUserId(Integer id) {
        }
    }

    // 좌석 선택 후 결제 단계로 넘어갈 때 사용
    @Getter
    @Setter
    public static class PaymentStartDTO {
        private Integer seatId;

        public void validate() {
            if (seatId == null) {
                throw new BadRequestException("좌석을 선택해주세요.");
            }
        }
    }

    // 결제 요청 DTO
    @Getter
    @Setter
    public static class PaymentConfirmDTO {
        private Integer bookingId;
        private String merchantUid;
        private Integer amount;
        private String method;

        public void validate() {
            if (bookingId == null) {
                throw new BadRequestException("예매 정보가 없습니다.");
            }
            if (merchantUid == null || merchantUid.isBlank()) {
                throw new BadRequestException("주문 번호가 없습니다.");
            }
            if (amount == null || amount <= 0) {
                throw new BadRequestException("결제 금액이 올바르지 않습니다.");
            }
            if (method == null || method.isBlank()) {
                throw new BadRequestException("결제 수단을 선택해주세요.");
            }
        }
    }

    // 예매 상태 변경 요청 DTO
    @Getter
    @Setter
    public static class UpdateStatusDTO {
        private Status status;

        public void validate() {
            if (status == null) {
                throw new BadRequestException("변경할 예매 상태가 없습니다.");
            }
        }
    }
}