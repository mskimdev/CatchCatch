package com.catchcatch.ticket.refund;

import lombok.Getter;
import lombok.NoArgsConstructor;

public class RefundRequest {

    public record SaveDTO(
            String reason
    ) {}

    /**
     * 포트원 V2 통신용 전용 바디
     */
    public record PortOneCancelBody(
            Integer amount, // 취소할 금액
            String reason   // 취소 사유
    ) {}
}