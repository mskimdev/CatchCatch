package com.catchcatch.ticket.ticket.dto;

public record TicketVerifyResponse(
        boolean valid,
        boolean checkedIn,
        String message,
        String bookingNumber,
        String concertTitle,
        String venueName,
        String username
) {
    public static TicketVerifyResponse invalid(String message) {
        return new TicketVerifyResponse(
                false,
                false,
                message,
                "-",
                "-",
                "-",
                "-"
        );
    }
}