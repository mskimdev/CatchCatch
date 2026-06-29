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

    @GetMapping("/crop-rotate")
    public String cropRotate(Model model) {
        setHeader(
                model,
                "도면 자르기 & 회전",
                "저장 위치: 정리 이미지",
                tempPath("seatmap-image.png"),
                "/admin/seatmap/main"
        );
        model.addAttribute("seatmapSubTitle", "원본 PNG를 정리한 뒤 버튼 이미지화 단계로 넘깁니다.");
        return "admin/seatmap/crop-rotate";
    }

    @ResponseBody
    @GetMapping("/project-list")
    public SeatMapService.ProjectListResult projectList() {
        return seatMapService.findProjects();
    }

    @ResponseBody
    @PostMapping("/project-create")
    public SeatMapService.ProjectCreateResult projectCreate(
            @RequestBody SeatMapRequest.ProjectCreateDTO req
    ) {
        return seatMapService.createProject(req);
    }

    @ResponseBody
    @PostMapping("/project-delete")
    public SeatMapService.ProjectDeleteResult projectDelete(
            @RequestBody SeatMapRequest.ProjectDeleteDTO req
    ) {
        return seatMapService.deleteProject(req);
    }

    // 이미지 버튼화 이미지 저장
    @ResponseBody
    @PostMapping("/overwrite-save")
    public ResponseEntity<Map<String, String>> overwriteSave(
            @RequestBody SeatMapRequest.OverwriteSaveDTO req
    ) {
        SeatMapService.OverwriteSaveResult result = seatMapService.overwriteSave(req);

        return ResponseEntity.ok(Map.of(
                "message", "저장 완료",
                "jsonUrl", result.jsonUrl(),
                "imageUrl", result.imageUrl()
        ));
    }

    // header 파일 저장
    @PostMapping("/temp-save")
    @ResponseBody
    public SeatMapService.TempSaveResult tempSave(@RequestBody SeatMapRequest.TempSaveDTO req) {
        return seatMapService.tempSave(req);
    }

    @GetMapping("/button-image")
    public String concertButtonImage(Model model) {
        setHeader(
                model,
                "버튼 이미지화",
                "저장 위치: 버튼 이미지",
                tempPath("button-image.png"),
                "/admin/seatmap/crop-rotate"
        );
        model.addAttribute("stage1Url", "/admin/seatmap/concert/stage1");
        model.addAttribute("stage2Url", "/admin/seatmap/concert/stage2");

        return "admin/seatmap/button-image";
    }

    @GetMapping("/concert/stage1")
    public String startConcertStage1(Model model) {
        setHeader(
                model,
                "Concert Stage1",
                "저장 위치: 버튼 이미지 · 구역 JSON",
                tempPath("button-image.png") + " · " + tempPath("seatmap-sections.json"),
                "/admin/seatmap/button-image"
        );
        model.addAttribute("seatmapStep", "1");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveCleanTop");
        model.addAttribute("stage2Url", "/admin/seatmap/concert/stage2");

        return "admin/seatmap/concert-stage1";
    }

    @GetMapping("/concert/stage2")
    public String startConcertStage2(Model model) {
        setHeader(
                model,
                "Concert Stage2",
                "저장 위치: 구역 JSON",
                tempPath("seatmap-sections.json"),
                "/admin/seatmap/concert/stage1"
        );
        model.addAttribute("seatmapStep", "2");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage2Top");
        model.addAttribute("stage1Url", "/admin/seatmap/concert/stage1");
        model.addAttribute("stage3Url", "/admin/seatmap/concert/stage3");

        return "admin/seatmap/concert-stage2";
    }

    @GetMapping("/concert/stage3")
    public String startConcertStage3(Model model) {
        setHeader(
                model,
                "Concert Stage3",
                "저장 위치: 좌석 JSON",
                tempPath("seatmap-seats.json"),
                "/admin/seatmap/concert/stage2"
        );
        model.addAttribute("seatmapStep", "3");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage3Top");
        model.addAttribute("stage4Url", "/admin/seatmap/concert/stage4");

        return "admin/seatmap/concert-stage3";
    }

    @GetMapping("/concert/stage4")
    public String startConcertStage4(Model model) {
        setHeader(
                model,
                "Concert Stage4",
                "저장 위치: 좌석 JSON · 구역 JSON · 도형 이미지",
                tempPath("seatmap-seats.json") + " · " + tempPath("seatmap-sections.json") + " · " + tempPath("seatmap-image.png"),
                "/admin/seatmap/concert/stage3"
        );
        model.addAttribute("seatmapStep", "4");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveAllJsonTop");

        return "admin/seatmap/concert-stage4";
    }


    private void setHeader(Model model, String title, String saveTitle, String savePathText, String prevUrl) {
        model.addAttribute("seatmapTitle", title);
        model.addAttribute("seatmapSaveTitle", saveTitle);
        model.addAttribute("seatmapSavePathText", savePathText);
        model.addAttribute("prevUrl", prevUrl);
    }

    private String tempPath(String fileName) {
        return "/temp/seatmap/concert-session/" + fileName;
    }

}
