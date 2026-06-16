package com.catchcatch.ticket.aichat;

import java.time.LocalDate;
import java.time.LocalTime;

public class AiChatToolResponse {

    public record ConcertSummaryDTO(
            Integer id,
            String title,
            String artist,
            String status,
            LocalDate startDate,
            String venueName
    ){}

    public record SessionInfoDTO(
            Integer sessionId,
            String round,
            LocalDate date,
            LocalTime time
    ){}

    public record SeatAvailabilityDTO(
            long vip,
            long r,
            long s,
            long a
    ){}
}
