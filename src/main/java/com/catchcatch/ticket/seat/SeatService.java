package com.catchcatch.ticket.seat;

import com.catchcatch.ticket.concert.core.Concert;
import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.session.ConcertSession;
import com.catchcatch.ticket.session.ConcertSessionRepository;
import com.catchcatch.ticket.venue.Venue;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.File;
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
    public void createSeatsFromJson(Integer sessionId)
    {
        ConcertSession session = concertSessionRepository.findById(sessionId)
                .orElseThrow(() -> new RuntimeException("해당 회차를 찾을 수 없습니다."));

        Concert concert = session.getConcert();
        Venue venue = concert.getVenue();

        String filePath = venue.getSeatMapFilePath();
        if (filePath == null || filePath.isBlank()){
            throw new BadRequestException("해당 공연장에 등록된 좌석 도면(JSON)이 없습니다.");
        }

        ObjectMapper objectMapper = new ObjectMapper();
        List<SeatRequest.SeatJsonDTO> jsonSeats;
        try{
            java.io.File jsonFile = new File(filePath);
            jsonSeats = objectMapper.readValue(
                    jsonFile,
                    new TypeReference<List<SeatRequest.SeatJsonDTO>>() {}
            );
        }catch (Exception e){
            throw new RuntimeException("도면 JSON 파싱 중 오류가 발생했습니다.", e); // TODO - 에러메서드 변경
        }

        List<Seat> seatEntities = new ArrayList<>();
        for (SeatRequest.SeatJsonDTO dto : jsonSeats) {

            String[] parts = dto.getId().split("-");

            if (parts.length != 4) {
                System.out.println("잘못된 좌석 ID 포맷: " + dto.getId());
                continue;
            }

            // 3. 파싱
            Integer floor = Integer.parseInt(parts[0]);      // "1" -> 1
            String sectionName = parts[1];                   // "VIP"
            String seatRow = parts[2];                       // "A"
            Integer seatCol = Integer.parseInt(parts[3]);    // "1" -> 1

            String fullSeatNumber = floor + "층 " + sectionName + "구역 " + seatRow + "열 " + seatCol + "번";

            // 5. 등급 및 가격, 상태 세팅
            SeatGrade grade = SeatGrade.valueOf(dto.getGrade());
            Integer price = concert.getPriceByGrade(grade);
            SeatStatus status = "obstructed".equalsIgnoreCase(dto.getStatus()) ? SeatStatus.OBSTRUCTED : SeatStatus.AVAILABLE;

            // 6. 엔티티 조립
            seatEntities.add(Seat.builder()
                    .concertSession(session)
                    .floor(floor)
                    .sectionName(sectionName)
                    .seatRow(seatRow)
                    .seatCol(seatCol)
                    .seatNumber(fullSeatNumber)
                    .grade(grade)
                    .price(price)
                    .status(status)
                    .build());
        }

        seatJdbcRepository.batchInsertSeats(seatEntities);

    } // end of createSeatsFromJson


}