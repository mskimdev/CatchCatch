package com.catchcatch.ticket.seat;

import com.catchcatch.ticket.core.exception.BadRequestException;
import com.catchcatch.ticket.core.util.Resp;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/admin/sessions/{sessionId}/seats")
public class AdminSeatApiController {

    private final SeatService seatService;

    /**
     *  프론트엔드 에디터에서 추출된 좌석 배치 JSON 데이터를 받아
     *  해당 회차의 실물 좌석 데이터를 고속으로 일괄 생성
     *  POST / api/admin/sessions/1/seats
     */

    // @Operation(summary = "회차별 좌석 배치 도면 일괄 등록",
    // description = "그리드 에디터에서 파싱된 JSON 배열을 받아
    // Batch Insert를 수행합니다.")

    @PostMapping
    public ResponseEntity<Resp<String>> setupSessionSeats(
            @PathVariable Integer sessionId,
            @RequestBody List<SeatRequest.SeatJsonDTO> requestDTOs
            ){
        // 방어적 코드
        if (requestDTOs == null || requestDTOs.isEmpty()){
            throw new BadRequestException("등록할 좌석 데이터가 존재하지 않습니다.");
        }
        seatService.createSeatsFromJson(sessionId, requestDTOs);

        return Resp.ok("총" + requestDTOs.size() + "개의 좌석 배치가 성공적으로 완료되었습니다.");

    }

    // 테스트용
    @PostMapping("/{count}")
    public ResponseEntity<Resp<String>> testGenerate(
            @PathVariable Integer sessionId,
            @PathVariable Integer count
    ) {
        // 1. 더미 데이터 생성
        List<SeatRequest.SeatJsonDTO> dummyData = seatService.generateDummySeats(count);

        // 2. 우리가 만든 batchInsert 로직 바로 호출
        seatService.createSeatsFromJson(sessionId, dummyData);

        return Resp.ok(count + "개의 더미 좌석이 생성되었습니다.");
    }

}
