package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.ticket.dto.TicketVerifyResponse;
import com.catchcatch.ticket.ticket.TicketVerifyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

@Controller
@RequiredArgsConstructor
public class TicketVerifyController {

    private final TicketVerifyService ticketVerifyService;

    @GetMapping("/staff/tickets/verify")
    public String verifyPage(@RequestParam String token, Model model) {
        TicketVerifyResponse result = ticketVerifyService.verify(token);

        model.addAttribute("token", token);
        model.addAttribute("result", result);

        return "staff/ticket-verify";
    }

    @PostMapping("/api/staff/tickets/check-in")
    @ResponseBody
    public TicketVerifyResponse checkIn(@RequestParam String token) {
        return ticketVerifyService.checkIn(token);
    }
}