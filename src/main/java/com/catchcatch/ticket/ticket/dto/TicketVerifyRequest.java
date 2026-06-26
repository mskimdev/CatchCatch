package com.catchcatch.ticket.ticket.dto;

import jakarta.validation.constraints.NotBlank;

public class TicketVerifyRequest {

    public record CheckInDTO(
            @NotBlank(message = "입장권 토큰이 없습니다.")
            String token
    ) {
    }
}