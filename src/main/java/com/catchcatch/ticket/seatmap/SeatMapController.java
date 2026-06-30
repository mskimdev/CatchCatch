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

    @GetMapping("/stage/1")
    public String stage1(
            @RequestParam(defaultValue = "seat") String projectId,
            Model model
    ) {
        setHeader(
                model,
                projectId,
                "도면 정리",
                "원본 PNG를 그대로 띄우고, 드래그로 자를 영역을 선택합니다.",
                "저장 위치: 정리 이미지",
                projectPath(projectId, "cropped-image.png") + " · " + projectPath(projectId, "seatmap-image.png"),
                "/admin/seatmap/main"
        );
        model.addAttribute("seatmapStep", "1");
        model.addAttribute("showRotateTools", true);
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "original-image.png"));
        model.addAttribute("nextUrl", stageUrl(2, projectId));
        return "admin/seatmap/stage1";
    }

    @GetMapping("/stage/2")
    public String stage2(
            @RequestParam(defaultValue = "seat") String projectId,
            Model model
    ) {
        setHeader(
                model,
                projectId,
                "버튼 이미지화",
                "정리된 도면에서 도형 색상을 추출하고, 구역 버튼용 단색 이미지를 만듭니다.",
                "저장 위치: 버튼 이미지",
                projectPath(projectId, "button-image.png"),
                stageUrl(1, projectId)
        );
        model.addAttribute("seatmapStep", "2");
        model.addAttribute("stage3Url", stageUrl(3, projectId));
        model.addAttribute("stage4Url", stageUrl(4, projectId));
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "cropped-image.png"));
        return "admin/seatmap/stage2";
    }

    @GetMapping("/stage/3")
    public String stage3(
            @RequestParam(defaultValue = "seat") String projectId,
            Model model
    ) {
        setHeader(
                model,
                projectId,
                "구역 나누기",
                "도형을 구역 단위로 분리하고 이름, 층, 등급 같은 구역 정보를 정리합니다.",
                "저장 위치: 구역 JSON",
                projectPath(projectId, "seatmap-sections.json"),
                stageUrl(2, projectId)
        );
        model.addAttribute("seatmapStep", "3");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveCleanTop");
        model.addAttribute("stage4Url", stageUrl(4, projectId));
        model.addAttribute("stage2Url", stageUrl(2, projectId));
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "button-image.png"));
        return "admin/seatmap/stage3";
    }

    @GetMapping("/stage/4")
    public String stage4(
            @RequestParam(defaultValue = "seat") String projectId,
            Model model
    ) {
        setHeader(
                model,
                projectId,
                "좌석 배치",
                "Stage 3 구역 polygon을 기준으로 구역 안에 좌석만 배치합니다.",
                "저장 위치: 좌석 JSON",
                seatsPath(projectId),
                stageUrl(3, projectId)
        );
        model.addAttribute("seatmapStep", "4");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveSeatsBtn");
        model.addAttribute("stage3Url", stageUrl(3, projectId));
        model.addAttribute("stage5Url", stageUrl(5, projectId));
        model.addAttribute("sectionJsonUrl", projectPath(projectId, "seatmap-sections.json"));
        model.addAttribute("seatJsonUrl", seatsPath(projectId));
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "seatmap-image.png"));
        return "admin/seatmap/stage4";
    }

    @GetMapping("/stage/5")
    public String stage5(
            @RequestParam(defaultValue = "seat") String projectId,
            Model model
    ) {
        setHeader(
                model,
                projectId,
                "예매 버튼 생성",
                "CatchCatch 예매 화면에서 클릭할 구역 polygon과 버튼 위치 JSON을 검수합니다.",
                "저장 위치: 예매 버튼 JSON · 검수 이미지",
                projectPath(projectId, "booking-buttons.json") + " · " + projectPath(projectId, "debug-polygons.png"),
                stageUrl(4, projectId)
        );
        model.addAttribute("seatmapStep", "5");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveBookingButtonsBtn");
        model.addAttribute("stage6Url", stageUrl(6, projectId));
        model.addAttribute("stage4Url", stageUrl(4, projectId));
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "seatmap-image.png"));
        return "admin/seatmap/stage5";
    }

    @GetMapping("/stage/6")
    public String stage6(
            @RequestParam(defaultValue = "seat") String projectId,
            Model model
    ) {
        setHeader(
                model,
                projectId,
                "최종 꾸미기",
                "텍스트, 도형, 구역, 좌석을 직접 보정해서 예제 수준의 최종 도면으로 마무리합니다.",
                "저장 위치: 최종 도면 · 썸네일 · 꾸미기 JSON",
                projectPath(projectId, "seatmap-image.png") + " · " + projectPath(projectId, "thumbnail.png") + " · " + projectPath(projectId, "seatmap-decorations.json"),
                "/admin/seatmap/main"
        );
        model.addAttribute("seatmapStep", "6");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveAllJsonTop");
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "seatmap-image.png"));
        return "admin/seatmap/stage6";
    }

    // ===== legacy route redirects =====
    @GetMapping("/crop-rotate")
    public String legacyCropRotate(@RequestParam(defaultValue = "seat") String projectId) {
        return redirectToStage(1, projectId);
    }

    @GetMapping("/button-image")
    public String legacyButtonImage(@RequestParam(defaultValue = "seat") String projectId) {
        return redirectToStage(2, projectId);
    }

    @GetMapping("/concert/stage1")
    public String legacyConcertStage1(@RequestParam(defaultValue = "seat") String projectId) {
        return redirectToStage(3, projectId);
    }

    @GetMapping("/concert/stage2")
    public String legacyConcertStage2(@RequestParam(defaultValue = "seat") String projectId) {
        return redirectToStage(4, projectId);
    }

    @GetMapping("/concert/stage3")
    public String legacyConcertStage3(@RequestParam(defaultValue = "seat") String projectId) {
        return redirectToStage(5, projectId);
    }

    @GetMapping("/concert/stage4")
    public String legacyConcertStage4(@RequestParam(defaultValue = "seat") String projectId) {
        return redirectToStage(6, projectId);
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

    private void setHeader(
            Model model,
            String projectId,
            String title,
            String subTitle,
            String saveTitle,
            String savePathText,
            String prevUrl
    ) {
        model.addAttribute("projectId", projectId);
        model.addAttribute("projectPath", "/temp/seatmap/" + projectId);
        model.addAttribute("seatmapTitle", title);
        model.addAttribute("seatmapSubTitle", subTitle);
        model.addAttribute("seatmapSaveTitle", saveTitle);
        model.addAttribute("seatmapSavePathText", savePathText);
        model.addAttribute("prevUrl", prevUrl);
    }

    private String projectPath(String projectId, String fileName) {
        return "/temp/seatmap/" + projectId + "/" + fileName;
    }

    private String seatsPath(String projectId) {
        return "/temp/seatmap/seats/" + projectId + "-seatmap-seats.json";
    }

    private String stageUrl(int stageNo, String projectId) {
        return "/admin/seatmap/stage/" + stageNo + "?projectId=" + projectId;
    }

    private String redirectToStage(int stageNo, String projectId) {
        return "redirect:" + stageUrl(stageNo, projectId);
    }
}
