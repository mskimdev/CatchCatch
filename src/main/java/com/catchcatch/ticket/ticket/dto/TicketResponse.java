package com.catchcatch.ticket.ticket.dto;

public class TicketResponse {

    public record ViewDTO(
            boolean valid,
            String message,
            String bookingNumber,
            String concertTitle,
            String sessionText,
            String venueName,
            String seatText,
            String ticketToken
    ) {
        public static ViewDTO invalid(String message) {
            return new ViewDTO(
                    false,
                    message,
                    "-",
                    "-",
                    "-",
                    "-",
                    "-",
                    ""
            );
        }
    }
}