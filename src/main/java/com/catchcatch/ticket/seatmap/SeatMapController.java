package com.catchcatch.ticket.seatmap;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;

@Controller
@RequestMapping("/admin/seatmap")
public class SeatMapController {

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
}
