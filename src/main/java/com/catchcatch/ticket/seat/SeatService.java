package com.catchcatch.ticket.seat;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
        long availableSeatCount = seatRepository.countByConcertSession_IdAndStatus(sessionId, SeatStatus.AVAILABLE);
        long heldSeatCount = seatRepository.countByConcertSession_IdAndStatus(sessionId, SeatStatus.HELD);
        long soldSeatCount = seatRepository.countByConcertSession_IdAndStatus(sessionId, SeatStatus.SOLD);

        return new SeatResponse.SummaryDTO(
                totalSeatCount,
                availableSeatCount,
                heldSeatCount,
                soldSeatCount
        );
    }

    /**
     * 좌석 임시 점유
     *
     * 사용자가 좌석을 선택하고 다음 단계로 넘어갈 때 호출.
     * AVAILABLE 좌석만 HELD로 변경한다.
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
     *
     * 사용자가 이전 단계로 돌아가거나,
     * 좌석 보관 시간이 만료되었을 때 사용.
     */
    @Transactional
    public void 좌석해제(Integer sessionId, List<Integer> seatIds) {
        if (seatIds == null || seatIds.isEmpty()) {
            return;
        }

        List<Seat> seats = seatRepository.findAllByIdInAndSessionIdForUpdate(
                sessionId,
                seatIds.stream().distinct().toList()
        );

        seats.forEach(Seat::release);
    }
}