package com.catchcatch.ticket.seat;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.session.ConcertSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SeatService {

    private final SeatRepository seatRepository;
    private final SeatJdbcRepository seatJdbcRepository;
    private final ConcertSessionRepository concertSessionRepository;

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
     * <p>
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

    /**
     * 좌석 json 변환
     */

    @Transactional
    public void createSeatsFromJson(Integer sessionId,
                                    List<SeatRequest.SeatJsonDTO> jsonSeats
                                    )
    {

        ConcertSession session = concertSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("해당 회차를 찾을 수 없습니다."));

        Concert concert = session.getConcert();

        List<Seat> seatEntities = new ArrayList<>();

        for (SeatRequest.SeatJsonDTO jsonSeat : jsonSeats){
            // 파싱
            String[] parts = jsonSeat.getId().split("-");
            Integer floor = Integer.parseInt(parts[0]);
            String sectionName = parts[1];
            String seatRow = parts[2];
            Integer seatCol = Integer.parseInt(parts[3]);

            // seatNumber
            String fullSeatNumber = floor + "층" + sectionName + "구역" + seatRow + "열" + seatCol + "번";

            // 상태 맵핑
            SeatStatus status = "obstructed".equalsIgnoreCase(jsonSeat.getStatus())
                    ? SeatStatus.OBSTRUCTED : SeatStatus.AVAILABLE;
            SeatGrade grade = SeatGrade.valueOf(jsonSeat.getGrade());

            // 가격 책정
            Integer price = concert.getPriceByGrade(grade);

            // 엔티티 생성
            Seat seat = Seat.builder()
                    .concertSession(session)
                    .floor(floor)
                    .sectionName(sectionName)
                    .seatRow(seatRow)
                    .seatCol(seatCol)
                    .seatNumber(fullSeatNumber)
                    .grade(grade)
                    .price(price)
                    .status(status)
                    .build();

            seatEntities.add(seat);
        }

        seatJdbcRepository.batchInsertSeats(seatEntities);

    } // end of createSeatsFromJson


    // 더미데이터 추가하여 테스트용으로 사용
    public List<SeatRequest.SeatJsonDTO> generateDummySeats(int count) {
        List<SeatRequest.SeatJsonDTO> dummyList = new ArrayList<>();
        String[] grades = {"VIP", "R", "S", "A"};

        for (int i = 1; i <= count; i++) {
            SeatRequest.SeatJsonDTO seat = new SeatRequest.SeatJsonDTO();

            // 1-A-1-1 부터 10000까지 자동 생성
            seat.setId("1-A-1-" + i);
            seat.setGrade(grades[i % 4]);
            seat.setStatus("AVAILABLE");

            dummyList.add(seat);
        }
        return dummyList;
    }

}