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
    public String cropRotate(@RequestParam(defaultValue = "seat") String projectId, Model model) {
        setHeader(
                model,
                projectId,
                "도면 정리",
                "저장 위치: 정리 이미지",
                tempPath(projectId, "seatmap-image.png"),
                "/admin/seatmap/main"
        );
        model.addAttribute("seatmapSubTitle", "원본 PNG를 정리한 뒤 버튼 이미지 생성 단계로 넘깁니다.");
        model.addAttribute("nextUrl", withProject("/admin/seatmap/button-image", projectId));
        return "admin/seatmap/crop-rotate";
    }

    @ResponseBody
    @GetMapping("/project-list")
    public SeatMapService.ProjectListResult projectList() {
        return seatMapService.findProjects();
    }

    @ResponseBody
    @PostMapping("/project-create")
    public SeatMapService.ProjectCreateResult projectCreate(@RequestBody SeatMapRequest.ProjectCreateDTO req) {
        return seatMapService.createProject(req);
    }

    @ResponseBody
    @PostMapping("/project-delete")
    public SeatMapService.ProjectDeleteResult projectDelete(@RequestBody SeatMapRequest.ProjectDeleteDTO req) {
        return seatMapService.deleteProject(req);
    }

    @ResponseBody
    @PostMapping("/overwrite-save")
    public ResponseEntity<Map<String, String>> overwriteSave(@RequestBody SeatMapRequest.OverwriteSaveDTO req) {
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
    public String concertButtonImage(@RequestParam(defaultValue = "seat") String projectId, Model model) {
        setHeader(
                model,
                projectId,
                "버튼 이미지 생성",
                "저장 위치: 버튼 이미지",
                tempPath(projectId, "button-image.png"),
                withProject("/admin/seatmap/crop-rotate", projectId)
        );
        model.addAttribute("stage1Url", withProject("/admin/seatmap/concert/stage1", projectId));
        model.addAttribute("stage2Url", withProject("/admin/seatmap/concert/stage2", projectId));

        return "admin/seatmap/button-image";
    }

    @GetMapping("/concert/stage1")
    public String startConcertStage1(@RequestParam(defaultValue = "seat") String projectId, Model model) {
        setHeader(
                model,
                projectId,
                "구역 나누기",
                "저장 위치: 구역 JSON · 버튼 이미지",
                tempPath(projectId, "seatmap-sections.json") + " · " + tempPath(projectId, "button-image.png"),
                withProject("/admin/seatmap/button-image", projectId)
        );
        model.addAttribute("seatmapStep", "1");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveCleanTop");
        model.addAttribute("stage2Url", withProject("/admin/seatmap/concert/stage2", projectId));

        return "admin/seatmap/concert-stage1";
    }

    @GetMapping("/concert/stage2")
    public String startConcertStage2(@RequestParam(defaultValue = "seat") String projectId, Model model) {
        setHeader(
                model,
                projectId,
                "좌석 배치",
                "저장 위치: 좌석 JSON",
                tempPath(projectId, "seatmap-seats.json"),
                withProject("/admin/seatmap/concert/stage1", projectId)
        );
        model.addAttribute("seatmapStep", "2");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage2Top");
        model.addAttribute("stage1Url", withProject("/admin/seatmap/concert/stage1", projectId));
        model.addAttribute("stage3Url", withProject("/admin/seatmap/concert/stage3", projectId));

        return "admin/seatmap/concert-stage2";
    }

    @GetMapping("/concert/stage3")
    public String startConcertStage3(@RequestParam(defaultValue = "seat") String projectId, Model model) {
        setHeader(
                model,
                projectId,
                "예매 버튼 배치",
                "저장 위치: 예매 버튼 JSON · 좌석 JSON",
                tempPath(projectId, "booking-buttons.json") + " · " + tempPath(projectId, "seatmap-seats.json"),
                withProject("/admin/seatmap/concert/stage2", projectId)
        );
        model.addAttribute("seatmapStep", "3");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage3Top");
        model.addAttribute("stage4Url", withProject("/admin/seatmap/concert/stage4", projectId));

        return "admin/seatmap/concert-stage3";
    }

    @GetMapping("/concert/stage4")
    public String startConcertStage4(@RequestParam(defaultValue = "seat") String projectId, Model model) {
        setHeader(
                model,
                projectId,
                "최종 검수",
                "저장 위치: 좌석 JSON · 구역 JSON · 도형 이미지",
                tempPath(projectId, "seatmap-seats.json") + " · " + tempPath(projectId, "seatmap-sections.json") + " · " + tempPath(projectId, "seatmap-image.png"),
                withProject("/admin/seatmap/concert/stage3", projectId)
        );
        model.addAttribute("seatmapStep", "4");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveAllJsonTop");

        return "admin/seatmap/concert-stage4";
    }

    private void setHeader(Model model, String projectId, String title, String saveTitle, String savePathText, String prevUrl) {
        model.addAttribute("projectId", projectId);
        model.addAttribute("seatmapTitle", title);
        model.addAttribute("seatmapSaveTitle", saveTitle);
        model.addAttribute("seatmapSavePathText", savePathText);
        model.addAttribute("prevUrl", prevUrl);
    }

    private String tempPath(String projectId, String fileName) {
        String safeProjectId = projectId == null || projectId.isBlank() ? "seat" : projectId;
        return "/temp/seatmap/" + safeProjectId + "/" + fileName;
    }

    private String withProject(String url, String projectId) {
        String safeProjectId = projectId == null || projectId.isBlank() ? "seat" : projectId;
        return url + "?projectId=" + safeProjectId;
    }
}
