package com.catchcatch.ticket.seatmap;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.*;

import java.util.Map;


@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/seatmap")
public class SeatMapController {

    private final SeatMapService seatMapService;

    // 메인 화면 진입
    @GetMapping("main")
    public String startSeatMap() {

        return "admin/seatmap/main";
    }

    /**
     * 콘서트 좌석
     */
    @GetMapping("concert-stage1")
    public String startConcertStage1() {

        return "admin/seatmap/concert-stage1";
    }

    @GetMapping("concert-stage2")
    public String startConcertStage2() {

        return "admin/seatmap/concert-stage2";
    }

    @GetMapping("concert-stage3")
    public String startConcertStage3() {

        return "admin/seatmap/concert-stage3";
    }

    /**
     * 소극장 좌석
     */
    // todo 아직 미완성

    /**
     * Stage3 좌석 JSON 파일 저장
     */
    @ResponseBody
    @PostMapping("json/save")
    public ResponseEntity<Map<String, String>> saveSeatMapJson(
            @RequestBody SeatMapRequest.SaveDTO req
    ) {
        String jsonUrl = seatMapService.saveJsonFile(req);

        return ResponseEntity.ok(Map.of(
                "jsonUrl", jsonUrl
        ));
    }
}
