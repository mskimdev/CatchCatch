package com.catchcatch.ticket.ticket.controller;

import com.catchcatch.ticket.core.util.Resp;
import com.catchcatch.ticket.ticket.dto.TicketVerifyRequest;
import com.catchcatch.ticket.ticket.dto.TicketVerifyResponse;
import com.catchcatch.ticket.ticket.service.TicketVerifyService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/staff/tickets")
public class StaffTicketVerifyApiController {

    private final TicketVerifyService ticketVerifyService;

    @PostMapping("/check-in")
    public ResponseEntity<?> checkIn(@RequestBody @Valid TicketVerifyRequest.CheckInDTO req) {
        TicketVerifyResponse result = ticketVerifyService.checkIn(req.token());
        return Resp.ok(result);
    }
}