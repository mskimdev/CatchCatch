package com.catchcatch.ticket.seat;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatService {

    private final SeatRepository seatRepository;

    /**
     * 좌석 선택 화면에서 특정 회차의 좌석 목록 조회
     */
    public List<SeatResponse.SeatDTO> 좌석목록조회(Integer sessionId) {
        return seatRepository.findByConcertSession_IdOrderBySeatNumberAsc(sessionId)
                .stream()
                .map(SeatResponse.SeatDTO::new)
                .toList();
    }

    /**
     * 좌석 선택 화면 요약 정보 조회
     */
    public SeatResponse.SummaryDTO 좌석요약조회(Integer sessionId) {
        long totalSeatCount = seatRepository.countByConcertSession_Id(sessionId);

        long availableSeatCount = seatRepository.countByConcertSession_IdAndStatus(
                sessionId,
                SeatStatus.AVAILABLE
        );

        long heldSeatCount = seatRepository.countByConcertSession_IdAndStatus(
                sessionId,
                SeatStatus.HELD
        );

        return new SeatResponse.SummaryDTO(
                totalSeatCount,
                availableSeatCount,
                heldSeatCount
        );
    }

    /**
     * 좌석 선택 화면에서 좌석 등급별 요약 조회
     *
     * 예:
     * VIP - 총 100석, 남은 20석, 매진 70석
     * R   - 총 300석, 남은 120석, 매진 100석
     */
    public List<SeatResponse.GradeSummaryDTO> 좌석등급별요약조회(Integer sessionId) {
        return Arrays.stream(SeatGrade.values())
                .map(grade -> {
                    long totalSeatCount = seatRepository.countByConcertSession_IdAndGrade(
                            sessionId,
                            grade
                    );

                    long remainingSeatCount = seatRepository.countByConcertSession_IdAndGradeAndStatus(
                            sessionId,
                            grade,
                            SeatStatus.AVAILABLE
                    );

                    long heldSeatCount = seatRepository.countByConcertSession_IdAndGradeAndStatus(
                            sessionId,
                            grade,
                            SeatStatus.HELD
                    );

                    long soldSeatCount = seatRepository.countByConcertSession_IdAndGradeAndStatus(
                            sessionId,
                            grade,
                            SeatStatus.SOLD
                    );

                    return new SeatResponse.GradeSummaryDTO(
                            grade,
                            totalSeatCount,
                            remainingSeatCount,
                            heldSeatCount,
                            soldSeatCount
                    );
                })
                .filter(summary -> summary.getTotalSeatCount() > 0)
                .toList();
    }

    /**
     * 좌석 임시 점유
     */
    @Transactional
    public List<SeatResponse.SeatDTO> 좌석임시점유(
            Integer sessionId,
            SeatRequest.HoldDTO requestDTO
    ) {
        if (requestDTO == null || requestDTO.getSeatIds() == null || requestDTO.getSeatIds().isEmpty()) {
            throw new RuntimeException("선택된 좌석이 없습니다.");
        }

        List<Integer> seatIds = requestDTO.getSeatIds()
                .stream()
                .distinct()
                .sorted()
                .toList();

        if (seatIds.size() > 4) {
            throw new RuntimeException("좌석은 최대 4매까지 선택할 수 있습니다.");
        }

        List<Seat> seats = seatRepository.findAllByIdInAndSessionIdForUpdate(
                sessionId,
                seatIds
        );

        if (seats.size() != seatIds.size()) {
            throw new RuntimeException("잘못된 좌석이 포함되어 있습니다.");
        }

        seats.forEach(Seat::hold);

        return seats.stream()
                .map(SeatResponse.SeatDTO::new)
                .toList();
    }

    /**
     * 좌석 임시 점유 해제
     */
    @Transactional
    public void 좌석해제(Integer sessionId, List<Integer> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            return;
        }

        List<Integer> distinctSeatIds = seatIds.stream()
                .distinct()
                .sorted()
                .toList();

        List<Seat> seats = seatRepository.findAllByIdInAndSessionIdForUpdate(
                sessionId,
                distinctSeatIds
        );

        seats.forEach(Seat::release);
    }
}