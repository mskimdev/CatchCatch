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

    private static final String DEFAULT_PROJECT_ID = "seat";

    private final SeatMapService seatMapService;

    @GetMapping("/main")
    public String startSeatMap() {
        return "admin/seatmap/main";
    }

    @GetMapping("/crop-rotate")
    public String cropRotate(Model model) {
        setHeader(
                model,
                "도면 정리",
                "저장 위치: 정리 이미지",
                projectPath("cropped-image.png") + " · " + projectPath("seatmap-image.png"),
                "/admin/seatmap/main"
        );
        model.addAttribute("seatmapSubTitle", "원본 PNG를 유지한 채 자를 영역과 회전을 정리합니다.");
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
                projectPath("button-image.png"),
                "/admin/seatmap/crop-rotate"
        );
        model.addAttribute("stage1Url", "/admin/seatmap/concert/stage2");
        model.addAttribute("stage2Url", "/admin/seatmap/concert/stage2");

        return "admin/seatmap/button-image";
    }

    // 기존 URL 보존용: 옛 Stage1은 구역 나누기 단계로 넘긴다.
    @GetMapping("/concert/stage1")
    public String redirectOldConcertStage1() {
        return "redirect:/admin/seatmap/concert/stage2";
    }

    @GetMapping("/concert/stage2")
    public String startSectionSplit(Model model) {
        setHeader(
                model,
                "구역 나누기",
                "저장 위치: 구역 JSON",
                projectPath("seatmap-sections.json"),
                "/admin/seatmap/button-image"
        );
        model.addAttribute("seatmapStep", "3");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage2Top");
        model.addAttribute("stage1Url", "/admin/seatmap/button-image");
        model.addAttribute("stage3Url", "/admin/seatmap/concert/stage3");

        return "admin/seatmap/concert-stage2";
    }

    @GetMapping("/concert/stage3")
    public String startSeatLayout(Model model) {
        setHeader(
                model,
                "좌석 배치",
                "저장 위치: 등록용 좌석 JSON",
                "/temp/seatmap/seats/" + DEFAULT_PROJECT_ID + "-seatmap-seats.json",
                "/admin/seatmap/concert/stage2"
        );
        model.addAttribute("seatmapStep", "4");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage3Top");
        model.addAttribute("stage4Url", "/admin/seatmap/concert/stage4");

        return "admin/seatmap/concert-stage3";
    }

    @GetMapping("/concert/stage4")
    public String startBookingButton(Model model) {
        setHeader(
                model,
                "예매 버튼 생성",
                "저장 위치: 예매 버튼 JSON · 검수 이미지",
                projectPath("booking-buttons.json") + " · " + projectPath("debug-polygons.png"),
                "/admin/seatmap/concert/stage3"
        );
        model.addAttribute("seatmapStep", "5");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveAllJsonTop");
        model.addAttribute("nextUrl", "/admin/seatmap/final-decorate");

        return "admin/seatmap/concert-stage4";
    }

    @GetMapping("/final-decorate")
    public String startFinalDecorate(Model model) {
        setHeader(
                model,
                "최종 꾸미기",
                "저장 위치: 최종 도면 이미지",
                projectPath("seatmap-image.png") + " · " + projectPath("thumbnail.png"),
                "/admin/seatmap/concert/stage4"
        );
        model.addAttribute("seatmapStep", "6");
        return "admin/seatmap/final-decorate";
    }

    private void setHeader(Model model, String title, String saveTitle, String savePathText, String prevUrl) {
        model.addAttribute("seatmapTitle", title);
        model.addAttribute("seatmapSaveTitle", saveTitle);
        model.addAttribute("seatmapSavePathText", savePathText);
        model.addAttribute("prevUrl", prevUrl);
    }

    private String projectPath(String fileName) {
        return "/temp/seatmap/" + DEFAULT_PROJECT_ID + "/" + fileName;
    }
}
