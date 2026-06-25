package com.catchcatch.ticket.booking;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.ticket.dto.TicketVerifyResponse;
import com.catchcatch.ticket.ticket.TicketVerifyService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

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

    @GetMapping("/staff/tickets/verify-code")
    public String verifyByCode(@RequestParam String code, Model model) {
        try {
            String token = ticketVerifyService.findTokenByTicketCode(code);

            return "redirect:/staff/tickets/verify?token=" +
                    URLEncoder.encode(token, StandardCharsets.UTF_8);

        } catch (BadRequestException e) {
            TicketVerifyResponse result = TicketVerifyResponse.invalid(e.getMessage());

            model.addAttribute("token", "");
            model.addAttribute("result", result);

            return "staff/ticket-verify";
        }
    }

    @PostMapping("/api/staff/tickets/check-in")
    @ResponseBody
    public TicketVerifyResponse checkIn(@RequestParam String token) {
        return ticketVerifyService.checkIn(token);
    }
}