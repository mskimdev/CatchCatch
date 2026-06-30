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
    public String cropRotate(
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
        model.addAttribute("nextUrl", stageUrl("/admin/seatmap/button-image", projectId));
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
    public String concertButtonImage(
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
                stageUrl("/admin/seatmap/crop-rotate", projectId)
        );
        model.addAttribute("seatmapStep", "2");
        model.addAttribute("stage1Url", stageUrl("/admin/seatmap/concert/stage1", projectId));
        model.addAttribute("stage2Url", stageUrl("/admin/seatmap/concert/stage2", projectId));
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "cropped-image.png"));
        return "admin/seatmap/button-image";
    }

    @GetMapping("/concert/stage1")
    public String startConcertStage1(
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
                stageUrl("/admin/seatmap/button-image", projectId)
        );
        model.addAttribute("seatmapStep", "3");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveCleanTop");
        model.addAttribute("stage2Url", stageUrl("/admin/seatmap/concert/stage2", projectId));
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "button-image.png"));
        return "admin/seatmap/concert-stage1";
    }

    @GetMapping("/concert/stage2")
    public String startConcertStage2(
            @RequestParam(defaultValue = "seat") String projectId,
            Model model
    ) {
        setHeader(
                model,
                projectId,
                "좌석 배치",
                "구역별 행과 렬을 입력하고 좌석 ID를 생성합니다.",
                "저장 위치: 좌석 JSON",
                seatsPath(projectId),
                stageUrl("/admin/seatmap/concert/stage1", projectId)
        );
        model.addAttribute("seatmapStep", "4");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage2Top");
        model.addAttribute("stage1Url", stageUrl("/admin/seatmap/concert/stage1", projectId));
        model.addAttribute("stage3Url", stageUrl("/admin/seatmap/concert/stage3", projectId));
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "button-image.png"));
        return "admin/seatmap/concert-stage2";
    }

    @GetMapping("/concert/stage3")
    public String startConcertStage3(
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
                stageUrl("/admin/seatmap/concert/stage2", projectId)
        );
        model.addAttribute("seatmapStep", "5");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveStage3Top");
        model.addAttribute("stage4Url", stageUrl("/admin/seatmap/concert/stage4", projectId));
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "seatmap-image.png"));
        return "admin/seatmap/concert-stage3";
    }

    @GetMapping("/concert/stage4")
    public String startConcertStage4(
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
                stageUrl("/admin/seatmap/concert/stage3", projectId)
        );
        model.addAttribute("seatmapStep", "6");
        model.addAttribute("showTempSave", true);
        model.addAttribute("tempSaveButtonId", "saveAllJsonTop");
        model.addAttribute("seatmapImageUrl", projectPath(projectId, "seatmap-image.png"));
        return "admin/seatmap/concert-stage4";
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

    private String stageUrl(String path, String projectId) {
        return path + "?projectId=" + projectId;
    }
}
