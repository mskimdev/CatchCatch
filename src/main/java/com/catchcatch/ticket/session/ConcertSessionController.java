package com.catchcatch.ticket.session;


import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class ConcertSessionController {

    private final ConcertSessionService concertSessionService;

    /**
     * 관람일 클릭 시 해당 날짜의 회차 조회
     * <p>
     * 예:
     * GET /concert/session/times?concertId=1&date=2026-05-20
     */
    @GetMapping("/concert/session/times")
    public List<ConcertSessionResponse.TimeDTO> getSessionTimes(
            @RequestParam Integer concertId,
            @RequestParam("date")
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE)
            LocalDate date
    ) {
        return concertSessionService.회차조회(concertId, date);
    }

}
