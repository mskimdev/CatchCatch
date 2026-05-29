package com.catchcatch.ticket.session;


import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
@RequiredArgsConstructor
public class ConcertSessionController {

    private final ConcertSessionService concertSessionService;


}
