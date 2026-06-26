package com.catchcatch.ticket.ticket.controller;

import com.catchcatch.ticket.ticket.dto.TicketResponse;
import com.catchcatch.ticket.ticket.service.TicketVerifyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;

@Controller
@RequiredArgsConstructor
@RequestMapping("/ticket")
public class TicketViewController {

    private final TicketVerifyService ticketVerifyService;

    @GetMapping
    public String ticketView(@RequestParam String token, Model model) {
        TicketResponse.ViewDTO ticket = ticketVerifyService.getTicketView(token);

        if (!ticket.valid()) {
            model.addAttribute("error", ticket.message());
            return "ticket/ticket-view";
        }

        model.addAttribute("bookingNumber", ticket.bookingNumber());
        model.addAttribute("concertTitle", ticket.concertTitle());
        model.addAttribute("sessionText", ticket.sessionText());
        model.addAttribute("venueName", ticket.venueName());
        model.addAttribute("seatText", ticket.seatText());
        model.addAttribute("ticketToken", ticket.ticketToken());

        return "ticket/ticket-view";
    }
}