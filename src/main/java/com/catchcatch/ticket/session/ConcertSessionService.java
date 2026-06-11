package com.catchcatch.ticket.session;

import com.catchcatch.ticket.concert.repository.ConcertRepository;
import com.catchcatch.ticket.seat.SeatRepository;
import com.catchcatch.ticket.seat.SeatStatus;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ConcertSessionService {

    private final ConcertSessionRepository concertSessionRepository;
    private final SeatRepository seatRepository;
    private final ConcertRepository concertRepository;

    /**
     * 콘서트 상세 화면 달력 활성화용 관람일 조회
     * <p>
     * 이 메서드는 해당 콘서트가 열리는 날짜 목록만 반환한다.
     * 예: 2026-05-20, 2026-05-27
     */
    public List<LocalDate> 관람일조회(Integer concertId) {
        return concertSessionRepository.findDistinctSessionDatesByConcertId(concertId);
    }

    /**
     * 날짜 클릭 시 회차 조회
     * <p>
     * 예:
     * concertId = 1
     * sessionDate = 2026-05-20
     * <p>
     * 결과:
     * 10:00 남은 좌석: 20석
     * 16:00 남은 좌석: 1800석
     * 20:00 매진
     *  soldOut으로 매진여부만 판단, 매진 아닐 시 좌석 수는 프론트에서
     */
    public List<ConcertSessionResponse.TimeDTO> 회차조회(Integer concertId, LocalDate sessionDate) {
        List<ConcertSession> sessionList =
                concertSessionRepository.findSessionsByConcertIdAndDate(
                        concertId,
                        sessionDate
                );

        return sessionList.stream()
                .map(session -> {
                    Integer sessionId = session.getId();

                    long totalSeatCount = seatRepository.countByConcertSession_Id(sessionId);

                    long remainingSeatCount = seatRepository.countByConcertSession_IdAndStatus(
                            sessionId,
                            SeatStatus.AVAILABLE
                    );

                    boolean soldOut = remainingSeatCount == 0;

                    return new ConcertSessionResponse.TimeDTO(
                            sessionId,
                            session.getSessionTime(),
                            totalSeatCount,
                            remainingSeatCount,
                            soldOut
                    );
                })
                .toList();
    }

    /**
     * 예매하기 클릭 후 좌석 화면 이동 전 검증
     * <p>
     * 1. sessionId가 해당 concertId의 회차인지 확인
     * 2. 해당 회차에 AVAILABLE 좌석이 하나라도 있는지 확인
     */
    public ConcertSession 유효한회차조회(Integer concertId, Integer sessionId) {
        ConcertSession session = concertSessionRepository.findByIdAndConcertId(sessionId, concertId)
                .orElseThrow(() -> new RuntimeException("해당 공연의 회차를 찾을 수 없습니다."));

        boolean hasAvailableSeat = seatRepository.existsByConcertSession_IdAndStatus(
                sessionId,
                SeatStatus.AVAILABLE
        );

        if (!hasAvailableSeat) {
            throw new RuntimeException("매진된 회차입니다.");
        }

        return session;
    }

}