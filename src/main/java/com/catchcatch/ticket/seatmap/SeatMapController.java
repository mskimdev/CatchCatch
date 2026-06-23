package com.catchcatch.ticket.seatmap;

import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@Controller
@RequiredArgsConstructor
@RequestMapping("/admin/seatmap")
public class SeatMapController {

    private final SeatMapService seatMapService;

    @GetMapping("/main")
    public String startSeatMap() {
        return "admin/seatmap/main";
    }

    @GetMapping("/button-image")
    public String concertButtonImage(Model model) {
        model.addAttribute("stage1Url", "/admin/seatmap/concert/stage1");
        model.addAttribute("stage2Url", "/admin/seatmap/concert/stage2");

        return "admin/seatmap/concert-button-image";
    }

    @GetMapping("/concert/stage1")
    public String startConcertStage1(Model model) {
        model.addAttribute("seatmapTitle", "Concert Stage1");
        model.addAttribute("seatmapStep", "1");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveCleanTop");
        model.addAttribute("prevUrl", "/admin/seatmap/main");
        model.addAttribute("nextUrl", "/admin/seatmap/concert/stage2");
        model.addAttribute("nextLabel", "Stage2");

        return "admin/seatmap/concert-stage1";
    }

    @GetMapping("/concert/stage2")
    public String startConcertStage2(Model model) {
        model.addAttribute("seatmapTitle", "Concert Stage2");
        model.addAttribute("seatmapStep", "2");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage2Top");
        model.addAttribute("prevUrl", "/admin/seatmap/concert/stage1");
        model.addAttribute("nextUrl", "/admin/seatmap/concert/stage3");
        model.addAttribute("nextLabel", "Stage3");

        return "admin/seatmap/concert-stage2";
    }

    @GetMapping("/concert/stage3")
    public String startConcertStage3(Model model) {
        model.addAttribute("seatmapTitle", "Concert Stage3");
        model.addAttribute("seatmapStep", "3");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage3Top");
        model.addAttribute("prevUrl", "/admin/seatmap/concert/stage2");
        model.addAttribute("nextUrl", "/admin/seatmap/concert/stage4");
        model.addAttribute("nextLabel", "Stage4");

        return "admin/seatmap/concert-stage3";
    }

    @GetMapping("/concert/stage4")
    public String startConcertStage4(Model model) {
        model.addAttribute("seatmapTitle", "Concert Stage4");
        model.addAttribute("seatmapStep", "4");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveAllJsonTop");
        model.addAttribute("prevUrl", "/admin/seatmap/concert/stage3");
        model.addAttribute("nextUrl", "");
        model.addAttribute("nextLabel", "");

        return "admin/seatmap/concert-stage4";
    }

    @ResponseBody
    @PostMapping("/json/save")
    public ResponseEntity<Map<String, String>> saveSeatMapJson(
            @RequestBody SeatMapRequest.SaveDTO req
    ) {
        String jsonUrl = seatMapService.saveJsonFile(req);

        return ResponseEntity.ok(Map.of(
                "jsonUrl", jsonUrl
        ));
    }
}
