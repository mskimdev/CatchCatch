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
            @PathVariable Integer sessionId){

        seatService.createSeatsFromJson(sessionId);

        return Resp.ok(sessionId + "번 회차의 좌석이 도면 경로를 통해 성공적으로 생성되었습니다.");

    }

    @PostMapping("/test-generate/{count}")
    public ResponseEntity<Resp<String>> testGenerate(
            @PathVariable Integer sessionId,
            @PathVariable Integer count
    ) {
        // 1. Service에서 만든 더미 데이터 1만 개 생성기 호출
        List<SeatRequest.SeatJsonDTO> dummyData = seatService.generateDummySeats(count);

        // 2. 기존의 좌석 생성 로직(Batch Insert)에 더미 데이터 던져주기
        seatService.createSeatsFromJson(sessionId);

        return Resp.ok(count + "개의 더미 좌석이 성공적으로 생성되었습니다!");
    }

}
