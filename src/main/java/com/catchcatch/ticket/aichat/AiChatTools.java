package com.catchcatch.ticket.aichat;

import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.seat.SeatGrade;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.seat.SeatStatus;
import com.catchcatch.ticket.session.ConcertSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AiChatTools {

    private final ConcertRepository concertRepository;
    private final SeatRepository seatRepository;
    private final ConcertSessionRepository concertSessionRepository;

    @Tool(description = "공연명 또는 아티스트명으로 현재 예매 가능한 공연을 검색합니다.")
    @Transactional(readOnly = true)
    public List<AiChatToolResponse.ConcertSummaryDTO> searchConcerts(String keyword) {
        return concertRepository
                .findByKeywordWithVenue(keyword)
                .stream()
                .map(c -> new AiChatToolResponse.ConcertSummaryDTO(
                        c.getId(),
                        c.getTitle(),
                        c.getArtist(),
                        c.getConcertStatus().name(),
                        c.getStartDate(),
                        c.getVenue().getName()
                ))
                .toList();
    }

    @Tool(description = "공연 ID로 전체 회차 목록(sessionId, 날짜, 시간, 회차명)을 조회합니다.")
    public List<AiChatToolResponse.SessionInfoDTO> getConcertSessions(Integer concertId) {
        return concertSessionRepository
                .findByConcertIdOrderBySessionDateAscSessionTimeAsc(concertId)
                .stream()
                .map(s -> new AiChatToolResponse.SessionInfoDTO(
                        s.getId(),
                        s.getRound(),
                        s.getSessionDate(),
                        s.getSessionTime()
                ))
                .toList();
    }

    @Tool(description = "회차 ID로 등급별(VIP/R/S/A) 잔여 좌석 수를 조회합니다.")
    public AiChatToolResponse.SeatAvailabilityDTO getSeatAvailability(Integer sessionId) {
        return new AiChatToolResponse.SeatAvailabilityDTO(
                seatRepository.countByConcertSession_IdAndGradeAndStatus(sessionId, SeatGrade.VIP, SeatStatus.AVAILABLE),
                seatRepository.countByConcertSession_IdAndGradeAndStatus(sessionId, SeatGrade.R,   SeatStatus.AVAILABLE),
                seatRepository.countByConcertSession_IdAndGradeAndStatus(sessionId, SeatGrade.S,   SeatStatus.AVAILABLE),
                seatRepository.countByConcertSession_IdAndGradeAndStatus(sessionId, SeatGrade.A,   SeatStatus.AVAILABLE)
        );
    }
}