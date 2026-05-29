package com.catchcatch.ticket.seat;

import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/sessions/{sessionId}/seats")
public class SeatController {

    private final SeatService seatService;

    /**
     * 특정 회차의 좌석 목록 조회
     *
     * GET /api/sessions/1/seats
     */
    @GetMapping
    public List<SeatResponse.SeatDTO> getSeats(
            @PathVariable Integer sessionId
    ) {
        return seatService.좌석목록조회(sessionId);
    }

    /**
     * 특정 회차의 좌석 요약 조회
     *
     * GET /api/sessions/1/seats/summary
     */
    @GetMapping("/summary")
    public SeatResponse.SummaryDTO getSeatSummary(
            @PathVariable Integer sessionId
    ) {
        return seatService.좌석요약조회(sessionId);
    }

    /**
     * 좌석 임시 점유
     *
     * POST /api/sessions/1/seats/hold
     */
    @PostMapping("/hold")
    public List<SeatResponse.SeatDTO> holdSeats(
            @PathVariable Integer sessionId,
            @RequestBody SeatRequest.HoldDTO requestDTO
    ) {
        return seatService.좌석임시점유(sessionId, requestDTO);
    }

    /**
     * 좌석 임시 점유 해제
     *
     * PATCH /api/sessions/1/seats/release
     */
    @PatchMapping("/release")
    public void releaseSeats(
            @PathVariable Integer sessionId,
            @RequestBody SeatRequest.HoldDTO requestDTO
    ) {
        seatService.좌석해제(sessionId, requestDTO.getSeatIds());
    }
}