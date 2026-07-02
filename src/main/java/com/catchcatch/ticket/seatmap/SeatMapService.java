package com.catchcatch.ticket.seatmap;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Iterator;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SeatMapService {

    private final ObjectMapper objectMapper = new ObjectMapper();

    private static final Path SEATMAP_JSON_DIR =
            Path.of("src/main/resources/static/json/seatmap");

    private static final Path SOURCE_STATIC_DIR =
            Path.of("src/main/resources/static");

    private static final Path MAVEN_RUNTIME_STATIC_DIR =
            Path.of("target/classes/static");

    private static final Path GRADLE_RUNTIME_STATIC_DIR =
            Path.of("build/resources/main/static");

    private static final Path INTELLIJ_RUNTIME_STATIC_DIR =
            Path.of("out/production/resources/static");

    private static final String DEFAULT_SEATS_JSON = "[]";

    private static final String DEFAULT_SEAT_INDEX_JSON = """
            {
              "version": 1,
              "projectId": "",
              "totalSeatCount": 0,
              "sections": []
            }
            """;

    private static final String DEFAULT_SECTIONS_JSON = """
            [
              {
                "id": "1-VIP",
                "floor": "1",
                "name": "VIP",
                "grade": "VIP",
                "seatCount": 0
              }
            ]
            """;

    private static final String DEFAULT_BOOKING_BUTTONS_JSON = "[]";
    private static final String DEFAULT_DECORATIONS_JSON = "{\"texts\":[],\"shapes\":[],\"manualSeats\":[]}";
    private static final String DEFAULT_STYLE_JSON = "{\"version\":1,\"stage\":6,\"background\":{},\"layers\":[]}";

    // 새 도면 폴더 생성
    public ProjectCreateResult createProject(SeatMapRequest.ProjectCreateDTO req) {
        try {
            String projectName = defaultText(req.getProjectName(), "콘서트 대형장 도면");
            String folderName = resolveUniqueFolderName(sanitizeFolderName(defaultText(req.getFolderName(), projectName)));
            String folderRelativePath = projectFolderRelativePath(folderName);
            String seatsJsonRelativePath = seatsIndexRelativePath(folderName);
            String legacySeatsJsonRelativePath = legacySeatsJsonRelativePath(folderName);
            String now = LocalDateTime.now().toString();

            String originalImageRelativePath = folderRelativePath + "/original-image.png";
            String croppedImageRelativePath = folderRelativePath + "/cropped-image.png";
            String seatmapImageRelativePath = folderRelativePath + "/seatmap-image.png";
            String stage5ImageRelativePath = folderRelativePath + "/seatmap-stage5.png";
            String finalImageRelativePath = folderRelativePath + "/seatmap-final.png";
            String buttonImageRelativePath = folderRelativePath + "/button-image.png";
            String thumbnailImageRelativePath = folderRelativePath + "/thumbnail.png";
            String debugImageRelativePath = folderRelativePath + "/debug-polygons.png";
            String sectionJsonRelativePath = folderRelativePath + "/seatmap-sections.json";
            String bookingButtonsJsonRelativePath = folderRelativePath + "/booking-buttons.json";
            String decorationsJsonRelativePath = folderRelativePath + "/seatmap-decorations.json";
            String styleJsonRelativePath = folderRelativePath + "/seatmap-style.json";
            String metaJsonRelativePath = folderRelativePath + "/seatmap-meta.json";

            writeTextToStaticAll(seatsJsonRelativePath, defaultSeatIndexJson(folderName, 0));
            writeTextToStaticAll(legacySeatsJsonRelativePath, DEFAULT_SEATS_JSON);
            writeTextToStaticAll(sectionJsonRelativePath, DEFAULT_SECTIONS_JSON);
            writeTextToStaticAll(bookingButtonsJsonRelativePath, DEFAULT_BOOKING_BUTTONS_JSON);
            writeTextToStaticAll(decorationsJsonRelativePath, DEFAULT_DECORATIONS_JSON);
            writeTextToStaticAll(styleJsonRelativePath, DEFAULT_STYLE_JSON);

            if (req.getImageDataUrl() != null && req.getImageDataUrl().startsWith("data:image")) {
                byte[] imageBytes = decodeBase64Image(req.getImageDataUrl());

                // 새 도면 생성 시 각 단계가 바로 진입할 수 있도록 기본 PNG 세트를 전부 만든다.
                writeBytesToStaticAll(originalImageRelativePath, imageBytes);   // 01 입력 원본
                writeBytesToStaticAll(croppedImageRelativePath, imageBytes);    // 01 출력 / 02 입력
                writeBytesToStaticAll(seatmapImageRelativePath, imageBytes);    // 05~06 / booking 기준 이미지
                writeBytesToStaticAll(stage5ImageRelativePath, imageBytes);     // 05 출력 / 06 입력 후보, 최초는 원본 복사
                writeBytesToStaticAll(finalImageRelativePath, imageBytes);      // 06 출력, 최초는 원본 복사
                writeBytesToStaticAll(buttonImageRelativePath, imageBytes);     // 02 출력 / 03~04 입력, 최초는 원본 복사
                writeBytesToStaticAll(thumbnailImageRelativePath, imageBytes);  // 메인 목록 썸네일
                writeBytesToStaticAll(debugImageRelativePath, imageBytes);      // polygon 검수용, 최초는 원본 복사
            }

            String metaJson = buildMetaJson(
                    projectName,
                    folderName,
                    defaultText(req.getSourceFileName(), ""),
                    now,
                    now,
                    "CREATED"
            );
            writeTextToStaticAll(metaJsonRelativePath, metaJson);

            return new ProjectCreateResult(
                    true,
                    projectName,
                    folderName,
                    now,
                    now,
                    "/" + folderRelativePath,
                    "/" + originalImageRelativePath,
                    "/" + croppedImageRelativePath,
                    "/" + seatmapImageRelativePath,
                    "/" + buttonImageRelativePath,
                    "/" + thumbnailImageRelativePath,
                    "/" + stage5ImageRelativePath,
                    "/" + finalImageRelativePath,
                    "/" + debugImageRelativePath,
                    "/" + seatsJsonRelativePath,
                    "/" + sectionJsonRelativePath,
                    "/" + bookingButtonsJsonRelativePath,
                    "/" + decorationsJsonRelativePath,
                    "/" + styleJsonRelativePath,
                    "/" + metaJsonRelativePath
            );
        } catch (Exception e) {
            throw new RuntimeException("도면 프로젝트 생성 실패", e);
        }
    }

    // 저장된 도면 폴더 목록 조회
    public ProjectListResult findProjects() {
        try {
            Path baseDir = SOURCE_STATIC_DIR.resolve("temp/seatmap");

            if (!Files.exists(baseDir)) {
                return new ProjectListResult(List.of());
            }

            List<ProjectSummary> projects = new ArrayList<>();

            try (var stream = Files.list(baseDir)) {
                stream
                        .filter(Files::isDirectory)
                        .filter(folder -> !"seats".equals(folder.getFileName().toString()))
                        .sorted(Comparator.comparing(this::getLastModifiedTimeSafe).reversed())
                        .forEach(folder -> projects.add(toProjectSummary(folder)));
            }

            return new ProjectListResult(projects);
        } catch (Exception e) {
            throw new RuntimeException("도면 목록 조회 실패", e);
        }
    }

    // 저장된 도면 폴더 삭제
    public ProjectDeleteResult deleteProject(SeatMapRequest.ProjectDeleteDTO req) {
        try {
            String folderName = sanitizeFolderName(req.getFolderName());
            deleteStaticFolder(projectFolderRelativePath(folderName));
            deleteStaticFile(legacySeatsJsonRelativePath(folderName));
            return new ProjectDeleteResult(true, folderName);
        } catch (Exception e) {
            throw new RuntimeException("도면 프로젝트 삭제 실패", e);
        }
    }

    // 이미지 버튼화 이미지 저장
    public OverwriteSaveResult overwriteSave(SeatMapRequest.OverwriteSaveDTO req) {
        try {
            Path jsonPath = Path.of(
                    "src/main/resources/static/json/seatmap/seatmap-concert-session.json"
            );

            Path imagePath = Path.of(
                    "src/main/resources/static/images/seatmap/generated/seatmap-concert-image.png"
            );

            Files.createDirectories(jsonPath.getParent());
            Files.createDirectories(imagePath.getParent());

            String jsonText = req.getJsonText();

            if (jsonText == null || jsonText.isBlank()) {
                jsonText = "{}";
            }

            Files.writeString(jsonPath, jsonText, StandardCharsets.UTF_8);

            String imageDataUrl = req.getImageDataUrl();

            if (imageDataUrl != null && imageDataUrl.startsWith("data:image")) {
                String base64 = imageDataUrl.replaceFirst("^data:image/\\w+;base64,", "");
                byte[] imageBytes = Base64.getDecoder().decode(base64);
                Files.write(imagePath, imageBytes);
            }

            return new OverwriteSaveResult(
                    "/json/seatmap/seatmap-concert-session.json",
                    "/images/seatmap/generated/seatmap-concert-image.png"
            );

        } catch (IOException e) {
            throw new RuntimeException("좌석도 덮어쓰기 저장 실패", e);
        }
    }

    public record OverwriteSaveResult(
            String jsonUrl,
            String imageUrl
    ) {
    }

    // 작업 파일 저장
    public TempSaveResult tempSave(SeatMapRequest.TempSaveDTO req) {
        try {
            String folderName = sanitizeFolderName(req.getFolderName());
            String folderRelativePath = projectFolderRelativePath(folderName);
            String seatsJsonPath = seatsIndexRelativePath(folderName);
            String legacySeatsJsonPath = legacySeatsJsonRelativePath(folderName);

            String sectionJsonPath = folderRelativePath + "/seatmap-sections.json";
            String bookingButtonsJsonPath = folderRelativePath + "/booking-buttons.json";
            String decorationsJsonPath = folderRelativePath + "/seatmap-decorations.json";
            String styleJsonPath = folderRelativePath + "/seatmap-style.json";
            String croppedImagePath = folderRelativePath + "/cropped-image.png";
            String seatmapImagePath = folderRelativePath + "/seatmap-image.png";
            String stage5ImagePath = folderRelativePath + "/seatmap-stage5.png";
            String finalImagePath = folderRelativePath + "/seatmap-final.png";
            String buttonImagePath = folderRelativePath + "/button-image.png";
            String thumbnailPath = folderRelativePath + "/thumbnail.png";
            String debugImagePath = folderRelativePath + "/debug-polygons.png";
            String page = defaultText(req.getPage(), "");
            String imageUrl = "/" + seatmapImagePath;

            if (req.getSectionSeatJsonText() != null && !req.getSectionSeatJsonText().isBlank()) {
                writeSectionSeatFiles(folderName, req.getSectionSeatJsonText());
            } else if (req.getSeatJsonText() != null && !req.getSeatJsonText().isBlank()) {
                writeTextToStaticAll(legacySeatsJsonPath, req.getSeatJsonText());
            }

            if (req.getSectionJsonText() != null && !req.getSectionJsonText().isBlank()) {
                writeTextToStaticAll(sectionJsonPath, req.getSectionJsonText());
            }

            if (req.getBookingButtonJsonText() != null && !req.getBookingButtonJsonText().isBlank()) {
                writeTextToStaticAll(bookingButtonsJsonPath, req.getBookingButtonJsonText());
            }

            if (req.getDecorationJsonText() != null && !req.getDecorationJsonText().isBlank()) {
                writeTextToStaticAll(decorationsJsonPath, req.getDecorationJsonText());
            }

            if (req.getStyleJsonText() != null && !req.getStyleJsonText().isBlank()) {
                writeTextToStaticAll(styleJsonPath, req.getStyleJsonText());
            }

            if (req.getImageDataUrl() != null && req.getImageDataUrl().startsWith("data:image")) {
                byte[] imageBytes = decodeBase64Image(req.getImageDataUrl());

                if ("stage1".equals(page) || "seatmap-crop-rotate".equals(page) || "crop-rotate".equals(page)) {
                    // Stage 1은 이후 단계의 기준 도면을 바꾸는 작업이다.
                    // 자르기/방향 보정 저장 시 이후 단계가 stale 이미지를 물고 가지 않도록
                    // original-image.png를 제외한 모든 PNG 기준 파일을 같은 이미지로 초기화한다.
                    writeBytesToStaticAll(croppedImagePath, imageBytes);
                    writeBytesToStaticAll(seatmapImagePath, imageBytes);
                    writeBytesToStaticAll(stage5ImagePath, imageBytes);
                    writeBytesToStaticAll(finalImagePath, imageBytes);
                    writeBytesToStaticAll(buttonImagePath, imageBytes);
                    writeBytesToStaticAll(thumbnailPath, imageBytes);
                    writeBytesToStaticAll(debugImagePath, imageBytes);
                    imageUrl = "/" + croppedImagePath;
                } else if ("stage2".equals(page) || "seatmap-button-image".equals(page) || "button-image".equals(page)) {
                    writeBytesToStaticAll(buttonImagePath, imageBytes);
                    imageUrl = "/" + buttonImagePath;
                } else if ("stage4".equals(page)) {
                    // Stage 4 저장 이미지는 Stage 5/6이 바로 참고할 수 있는 최종 좌석 배치 이미지다.
                    // debug 이미지는 debugImageDataUrl이 별도로 오면 아래에서 다시 덮어쓴다.
                    writeBytesToStaticAll(seatmapImagePath, imageBytes);
                    writeBytesToStaticAll(stage5ImagePath, imageBytes);
                    writeBytesToStaticAll(thumbnailPath, imageBytes);
                    writeBytesToStaticAll(debugImagePath, imageBytes);
                    imageUrl = "/" + seatmapImagePath;
                } else if ("stage6".equals(page) || "seatmap-final-decorate".equals(page) || "final-decorate".equals(page)) {
                    // Stage 6는 최종 꾸미기 출력만 저장한다.
                    // Stage 4/5 기준 이미지와 booking-buttons.json 좌표는 덮어쓰지 않는다.
                    writeBytesToStaticAll(finalImagePath, imageBytes);
                    writeBytesToStaticAll(thumbnailPath, imageBytes);
                    imageUrl = "/" + finalImagePath;
                } else if ("stage5".equals(page) || "booking-buttons".equals(page)) {
                    // Stage 5의 imageDataUrl은 실제 예매용 버튼 이미지다.
                    // Stage 4 기준 seatmap-image.png는 유지하고 Stage 5 산출물만 별도로 저장한다.
                    writeBytesToStaticAll(stage5ImagePath, imageBytes);
                    imageUrl = "/" + stage5ImagePath;
                } else if ("stage3".equals(page)) {
                    // Stage 3의 이미지 저장은 최종 도면을 덮지 않고 검수용 debug 이미지로만 저장한다.
                    writeBytesToStaticAll(debugImagePath, imageBytes);
                    imageUrl = "/" + debugImagePath;
                } else {
                    writeBytesToStaticAll(seatmapImagePath, imageBytes);
                    imageUrl = "/" + seatmapImagePath;
                }
            }

            if (req.getFinalImageDataUrl() != null && req.getFinalImageDataUrl().startsWith("data:image")) {
                byte[] finalImageBytes = decodeBase64Image(req.getFinalImageDataUrl());
                if ("stage5".equals(page) || "booking-buttons".equals(page)) {
                    writeBytesToStaticAll(stage5ImagePath, finalImageBytes);
                    imageUrl = "/" + stage5ImagePath;
                } else if ("stage6".equals(page) || "seatmap-final-decorate".equals(page) || "final-decorate".equals(page)) {
                    writeBytesToStaticAll(finalImagePath, finalImageBytes);
                    writeBytesToStaticAll(thumbnailPath, finalImageBytes);
                    imageUrl = "/" + finalImagePath;
                } else {
                    writeBytesToStaticAll(seatmapImagePath, finalImageBytes);
                    writeBytesToStaticAll(thumbnailPath, finalImageBytes);
                    imageUrl = "/" + seatmapImagePath;
                }
            }

            if (req.getDebugImageDataUrl() != null && req.getDebugImageDataUrl().startsWith("data:image")) {
                byte[] debugImageBytes = decodeBase64Image(req.getDebugImageDataUrl());
                writeBytesToStaticAll(debugImagePath, debugImageBytes);
            }

            // 과거 잘못 생성된 프로젝트 내부 seatmap-seats.json은 저장 시 제거한다.
            deleteStaticFile(folderRelativePath + "/seatmap-seats.json");

            writeTempSaveMeta(folderName, folderRelativePath, seatsJsonPath, defaultText(req.getPage(), ""), req);

            return new TempSaveResult(
                    true,
                    folderName,
                    "/" + folderRelativePath,
                    "/" + seatsJsonPath,
                    "/" + sectionJsonPath,
                    imageUrl,
                    "/" + croppedImagePath,
                    "/" + buttonImagePath,
                    "/" + thumbnailPath,
                    "/" + stage5ImagePath,
                    "/" + finalImagePath,
                    "/" + debugImagePath,
                    "/" + bookingButtonsJsonPath,
                    "/" + decorationsJsonPath,
                    "/" + styleJsonPath
            );
        } catch (Exception e) {
            throw new RuntimeException("좌석도 임시 저장 실패", e);
        }
    }

    @Getter
    @AllArgsConstructor
    public static class TempSaveResult {
        private boolean success;
        private String folderName;
        private String folderUrl;
        private String seatJsonUrl;
        private String sectionJsonUrl;
        private String imageUrl;
        private String croppedImageUrl;
        private String buttonImageUrl;
        private String thumbnailImageUrl;
        private String stage5ImageUrl;
        private String finalImageUrl;
        private String debugImageUrl;
        private String bookingButtonsJsonUrl;
        private String decorationsJsonUrl;
        private String styleJsonUrl;
    }

    @Getter
    @AllArgsConstructor
    public static class ProjectCreateResult {
        private boolean success;
        private String projectName;
        private String folderName;
        private String createdAt;
        private String updatedAt;
        private String folderUrl;
        private String originalImageUrl;
        private String croppedImageUrl;
        private String imageUrl;
        private String buttonImageUrl;
        private String thumbnailImageUrl;
        private String stage5ImageUrl;
        private String finalImageUrl;
        private String debugImageUrl;
        private String seatJsonUrl;
        private String sectionJsonUrl;
        private String bookingButtonsJsonUrl;
        private String decorationsJsonUrl;
        private String styleJsonUrl;
        private String metaJsonUrl;
    }

    @Getter
    @AllArgsConstructor
    public static class ProjectListResult {
        private List<ProjectSummary> projects;
    }

    @Getter
    @AllArgsConstructor
    public static class ProjectDeleteResult {
        private boolean success;
        private String folderName;
    }

    @Getter
    @AllArgsConstructor
    public static class ProjectSummary {
        private String projectName;
        private String folderName;
        private String createdAt;
        private String updatedAt;
        private String folderUrl;
        private String originalImageUrl;
        private String croppedImageUrl;
        private String imageUrl;
        private String buttonImageUrl;
        private String thumbnailImageUrl;
        private String stage5ImageUrl;
        private String finalImageUrl;
        private String debugImageUrl;
        private String seatJsonUrl;
        private String sectionJsonUrl;
        private String bookingButtonsJsonUrl;
        private String decorationsJsonUrl;
        private String styleJsonUrl;
        private String metaJsonUrl;
    }

    private ProjectSummary toProjectSummary(Path folder) {
        String folderName = folder.getFileName().toString();
        Path metaPath = folder.resolve("seatmap-meta.json");
        String metaText = readStringIfExists(metaPath);
        String projectName = extractJsonString(metaText, "name", folderName);
        String createdAt = extractJsonString(metaText, "createdAt", "");
        String updatedAt = extractJsonString(metaText, "updatedAt", getLastModifiedTimeSafe(folder));
        String folderUrl = "/" + projectFolderRelativePath(folderName);

        return new ProjectSummary(
                projectName,
                folderName,
                createdAt,
                updatedAt,
                folderUrl,
                folderUrl + "/original-image.png",
                folderUrl + "/cropped-image.png",
                folderUrl + "/seatmap-image.png",
                folderUrl + "/button-image.png",
                folderUrl + "/thumbnail.png",
                folderUrl + "/seatmap-stage5.png",
                folderUrl + "/seatmap-final.png",
                folderUrl + "/debug-polygons.png",
                "/" + seatsIndexRelativePath(folderName),
                folderUrl + "/seatmap-sections.json",
                folderUrl + "/booking-buttons.json",
                folderUrl + "/seatmap-decorations.json",
                folderUrl + "/seatmap-style.json",
                folderUrl + "/seatmap-meta.json"
        );
    }

    private String buildMetaJson(
            String projectName,
            String folderName,
            String sourceFileName,
            String createdAt,
            String updatedAt,
            String status
    ) {
        return buildMetaJson(
                projectName,
                folderName,
                sourceFileName,
                createdAt,
                updatedAt,
                status,
                false,
                0,
                0,
                0
        );
    }

    private String buildMetaJson(
            String projectName,
            String folderName,
            String sourceFileName,
            String createdAt,
            String updatedAt,
            String status,
            boolean stage5Saved,
            int sectionCount,
            int seatCount,
            int bookingButtonCount
    ) {
        return "{"
                + "\"name\":\"" + jsonEscape(projectName) + "\","
                + "\"projectId\":\"" + jsonEscape(folderName) + "\","
                + "\"type\":\"CONCERT\","
                + "\"status\":\"" + jsonEscape(status) + "\","
                + "\"currentStage\":\"" + jsonEscape(extractCurrentStage(status)) + "\","
                + "\"stage5Saved\":" + stage5Saved + ","
                + "\"sectionCount\":" + Math.max(sectionCount, 0) + ","
                + "\"seatCount\":" + Math.max(seatCount, 0) + ","
                + "\"bookingButtonCount\":" + Math.max(bookingButtonCount, 0) + ","
                + "\"folderName\":\"" + jsonEscape(folderName) + "\","
                + "\"sourceFileName\":\"" + jsonEscape(sourceFileName) + "\","
                + "\"createdAt\":\"" + jsonEscape(createdAt) + "\","
                + "\"updatedAt\":\"" + jsonEscape(updatedAt) + "\","
                + "\"files\":{"
                + "\"originalImage\":\"original-image.png\","
                + "\"croppedImage\":\"cropped-image.png\","
                + "\"seatmapImage\":\"seatmap-image.png\","
                + "\"stage5Image\":\"seatmap-stage5.png\","
                + "\"finalImage\":\"seatmap-final.png\","
                + "\"buttonImage\":\"button-image.png\","
                + "\"thumbnail\":\"thumbnail.png\","
                + "\"debugPolygons\":\"debug-polygons.png\","
                + "\"sections\":\"seatmap-sections.json\","
                + "\"bookingButtons\":\"booking-buttons.json\","
                + "\"decorations\":\"seatmap-decorations.json\","
                + "\"style\":\"seatmap-style.json\","
                 + "\"seats\":\"/temp/seatmap/" + jsonEscape(folderName) + "/seats/index.json\","
                + "\"legacySeats\":\"/temp/seatmap/seats/" + jsonEscape(folderName) + "-seatmap-seats.json\""
                + "}"
                + "}";
    }


    private void writeTempSaveMeta(
            String folderName,
            String folderRelativePath,
            String seatsJsonPath,
            String page,
            SeatMapRequest.TempSaveDTO req
    ) throws IOException {
        String metaJsonPath = folderRelativePath + "/seatmap-meta.json";
        String previousMeta = readStringIfExists(SOURCE_STATIC_DIR.resolve(metaJsonPath));
        String now = LocalDateTime.now().toString();
        String projectName = extractJsonString(previousMeta, "name", folderName);
        String sourceFileName = extractJsonString(previousMeta, "sourceFileName", "");
        String createdAt = extractJsonString(previousMeta, "createdAt", now);
        String status = resolveTempSaveStatus(page);
        boolean previousStage5Saved = extractJsonBoolean(previousMeta, "stage5Saved", false);
        boolean stage5Saved = isStage5Page(page)
                || Boolean.TRUE.equals(req.getStage5Saved())
                || (isStage6Page(page) && previousStage5Saved);

        int sectionCount = 0;
        int seatCount = 0;
        int bookingButtonCount = 0;

        if (stage5Saved) {
            sectionCount = firstCount(
                    req.getSectionCount(),
                    countJsonArrayItems(req.getSectionJsonText()),
                    countJsonArrayItems(readStringIfExists(SOURCE_STATIC_DIR.resolve(folderRelativePath + "/seatmap-sections.json")))
            );
            seatCount = firstCount(
                    req.getSeatCount(),
                    countJsonArrayItems(req.getSeatJsonText()),
                    countJsonArrayItems(readStringIfExists(SOURCE_STATIC_DIR.resolve(seatsJsonPath)))
            );
            bookingButtonCount = firstCount(
                    req.getBookingButtonCount(),
                    countJsonArrayItems(req.getBookingButtonJsonText()),
                    countJsonArrayItems(readStringIfExists(SOURCE_STATIC_DIR.resolve(folderRelativePath + "/booking-buttons.json")))
            );
        }

        writeTextToStaticAll(
                metaJsonPath,
                buildMetaJson(
                        projectName,
                        folderName,
                        sourceFileName,
                        createdAt,
                        now,
                        status,
                        stage5Saved,
                        sectionCount,
                        seatCount,
                        bookingButtonCount
                )
        );
    }

    private String resolveTempSaveStatus(String page) {
        return switch (defaultText(page, "")) {
            case "stage1", "seatmap-crop-rotate", "crop-rotate" -> "STAGE1_CROPPED_IMAGE_READY";
            case "stage2", "seatmap-button-image", "button-image" -> "STAGE2_BUTTON_IMAGE_READY";
            case "stage3" -> "STAGE3_SECTIONS_READY";
            case "stage4" -> "STAGE4_SEATS_READY";
            case "stage5", "booking-buttons" -> "STAGE5_BOOKING_BUTTONS_READY";
            case "stage6", "seatmap-final-decorate", "final-decorate" -> "STAGE6_FINAL_IMAGE_READY";
            default -> "UPDATED";
        };
    }

    private boolean isStage5Page(String page) {
        String normalizedPage = defaultText(page, "");
        return "stage5".equals(normalizedPage) || "booking-buttons".equals(normalizedPage);
    }

    private boolean isStage6Page(String page) {
        String normalizedPage = defaultText(page, "");
        return "stage6".equals(normalizedPage)
                || "seatmap-final-decorate".equals(normalizedPage)
                || "final-decorate".equals(normalizedPage);
    }

    private int firstCount(Integer... values) {
        if (values == null) {
            return 0;
        }

        for (Integer value : values) {
            if (value != null && value >= 0) {
                return value;
            }
        }

        return 0;
    }

    private Integer countJsonArrayItems(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }

        String text = json.trim();
        if (!text.startsWith("[") || !text.endsWith("]")) {
            return null;
        }

        boolean inString = false;
        boolean escaped = false;
        int depth = 0;
        int count = 0;
        boolean hasValue = false;

        for (int i = 1; i < text.length() - 1; i++) {
            char ch = text.charAt(i);

            if (escaped) {
                escaped = false;
                continue;
            }

            if (ch == '\\') {
                escaped = inString;
                continue;
            }

            if (ch == '"') {
                inString = !inString;
                hasValue = true;
                continue;
            }

            if (inString) {
                continue;
            }

            if (ch == '{' || ch == '[') {
                depth++;
                hasValue = true;
                continue;
            }

            if (ch == '}' || ch == ']') {
                depth--;
                continue;
            }

            if (depth == 0 && ch == ',') {
                count++;
                continue;
            }

            if (!Character.isWhitespace(ch)) {
                hasValue = true;
            }
        }

        return hasValue ? count + 1 : 0;
    }

    private String extractCurrentStage(String status) {
        if (status == null) {
            return "";
        }

        Matcher matcher = Pattern.compile("STAGE(\\d+)").matcher(status);
        if (matcher.find()) {
            return matcher.group(1);
        }

        return "";
    }

    private String projectFolderRelativePath(String folderName) {
        return "temp/seatmap/" + sanitizeFolderName(folderName);
    }

    private String seatsIndexRelativePath(String folderName) {
        return projectFolderRelativePath(folderName) + "/seats/index.json";
    }

    private String legacySeatsJsonRelativePath(String folderName) {
        return "temp/seatmap/seats/" + sanitizeFolderName(folderName) + "-seatmap-seats.json";
    }

    private String defaultSeatIndexJson(String folderName, int totalSeatCount) {
        return "{"
                + "\"version\":1,"
                + "\"projectId\":\"" + jsonEscape(folderName) + "\","
                + "\"totalSeatCount\":" + totalSeatCount + ","
                + "\"sections\":[]"
                + "}";
    }

    private String resolveUniqueFolderName(String folderName) {
        String baseName = sanitizeFolderName(folderName);
        if ("seats".equalsIgnoreCase(baseName)) {
            baseName = "seatmap-seats-project";
        }
        Path baseDir = SOURCE_STATIC_DIR.resolve("temp/seatmap");
        Path targetPath = baseDir.resolve(baseName);

        if (!Files.exists(targetPath)) {
            return baseName;
        }

        int index = 1;
        while (true) {
            String numberedName = baseName + "-" + index;
            Path numberedPath = baseDir.resolve(numberedName);

            if (!Files.exists(numberedPath)) {
                return numberedName;
            }

            index++;
        }
    }

    private Path resolveUniquePath(String fileName) {
        Path targetPath = SEATMAP_JSON_DIR.resolve(fileName);

        if (!Files.exists(targetPath)) {
            return targetPath;
        }

        String baseName = removeJsonExtension(fileName);
        int index = 1;

        while (true) {
            String numberedFileName = baseName + "-" + index + ".json";
            Path numberedPath = SEATMAP_JSON_DIR.resolve(numberedFileName);

            if (!Files.exists(numberedPath)) {
                return numberedPath;
            }

            index++;
        }
    }

    private String removeJsonExtension(String fileName) {
        if (fileName != null && fileName.toLowerCase().endsWith(".json")) {
            return fileName.substring(0, fileName.length() - 5);
        }

        return fileName;
    }

    private String sanitizeFolderName(String folderName) {
        if (folderName == null || folderName.isBlank()) {
            return "seat";
        }

        String cleaned = folderName
                .trim()
                .replaceAll("\\s+", "_")
                .replaceAll("[^a-zA-Z0-9가-힣._-]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");

        if (cleaned.isBlank()) {
            return "seat";
        }

        return cleaned;
    }

    private String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "seatmap.json";
        }

        String cleaned = fileName.replaceAll("[^a-zA-Z0-9가-힣._-]", "_");

        if (!cleaned.toLowerCase().endsWith(".json")) {
            cleaned += ".json";
        }

        return cleaned;
    }

    private void deleteStaticFolder(String relativePath) throws IOException {
        deleteFolder(SOURCE_STATIC_DIR.resolve(relativePath));
        deleteFolder(MAVEN_RUNTIME_STATIC_DIR.resolve(relativePath));
        deleteFolder(GRADLE_RUNTIME_STATIC_DIR.resolve(relativePath));
        deleteFolder(INTELLIJ_RUNTIME_STATIC_DIR.resolve(relativePath));
    }

    private void deleteStaticFile(String relativePath) throws IOException {
        Files.deleteIfExists(SOURCE_STATIC_DIR.resolve(relativePath));
        Files.deleteIfExists(MAVEN_RUNTIME_STATIC_DIR.resolve(relativePath));
        Files.deleteIfExists(GRADLE_RUNTIME_STATIC_DIR.resolve(relativePath));
        Files.deleteIfExists(INTELLIJ_RUNTIME_STATIC_DIR.resolve(relativePath));
    }

    private void deleteFolder(Path folderPath) throws IOException {
        if (folderPath == null || !Files.exists(folderPath)) {
            return;
        }

        if (!Files.isDirectory(folderPath)) {
            Files.deleteIfExists(folderPath);
            return;
        }

        try (var stream = Files.walk(folderPath)) {
            stream
                    .sorted(Comparator.reverseOrder())
                    .forEach(path -> {
                        try {
                            Files.deleteIfExists(path);
                        } catch (IOException e) {
                            throw new RuntimeException(e);
                        }
                    });
        } catch (RuntimeException e) {
            if (e.getCause() instanceof IOException ioException) {
                throw ioException;
            }
            throw e;
        }
    }


    private void writeSectionSeatFiles(String folderName, String sectionSeatJsonText) throws IOException {
        JsonNode root = objectMapper.readTree(sectionSeatJsonText);
        JsonNode indexNode = root.path("index");
        JsonNode filesNode = root.path("files");

        String seatsFolderPath = projectFolderRelativePath(folderName) + "/seats";

        deleteStaticFolder(seatsFolderPath);

        if (indexNode.isMissingNode() || indexNode.isNull()) {
            indexNode = root;
        }

        writeTextToStaticAll(
                seatsFolderPath + "/index.json",
                objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(indexNode)
        );

        if (filesNode != null && filesNode.isObject()) {
            Iterator<Map.Entry<String, JsonNode>> fields = filesNode.fields();
            while (fields.hasNext()) {
                Map.Entry<String, JsonNode> entry = fields.next();
                String fileName = sanitizeSeatSectionFileName(entry.getKey());
                writeTextToStaticAll(
                        seatsFolderPath + "/" + fileName,
                        objectMapper.writerWithDefaultPrettyPrinter().writeValueAsString(entry.getValue())
                );
            }
        }
    }

    private String sanitizeSeatSectionFileName(String fileName) {
        String cleaned = defaultText(fileName, "section.json")
                .replaceAll("[\\\\/]+", "_")
                .replaceAll("[^a-zA-Z0-9가-힣._-]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");

        if (cleaned.isBlank()) {
            cleaned = "section.json";
        }

        if (!cleaned.toLowerCase().endsWith(".json")) {
            cleaned += ".json";
        }

        return cleaned;
    }

    private void writeTextToStaticAll(String relativePath, String text) throws IOException {
        writeText(SOURCE_STATIC_DIR.resolve(relativePath), text);
        writeText(MAVEN_RUNTIME_STATIC_DIR.resolve(relativePath), text);
        writeText(GRADLE_RUNTIME_STATIC_DIR.resolve(relativePath), text);
        writeText(INTELLIJ_RUNTIME_STATIC_DIR.resolve(relativePath), text);
    }

    private void writeBytesToStaticAll(String relativePath, byte[] bytes) throws IOException {
        writeBytes(SOURCE_STATIC_DIR.resolve(relativePath), bytes);
        writeBytes(MAVEN_RUNTIME_STATIC_DIR.resolve(relativePath), bytes);
        writeBytes(GRADLE_RUNTIME_STATIC_DIR.resolve(relativePath), bytes);
        writeBytes(INTELLIJ_RUNTIME_STATIC_DIR.resolve(relativePath), bytes);
    }

    private void writeText(Path path, String text) throws IOException {
        Files.createDirectories(path.getParent());
        Files.writeString(path, text == null ? "" : text, StandardCharsets.UTF_8);
    }

    private void writeBytes(Path path, byte[] bytes) throws IOException {
        Files.createDirectories(path.getParent());
        Files.write(path, bytes);
    }

    private byte[] decodeBase64Image(String dataUrl) {
        int commaIndex = dataUrl.indexOf(",");
        String base64 = commaIndex >= 0 ? dataUrl.substring(commaIndex + 1) : dataUrl;
        return Base64.getDecoder().decode(base64);
    }

    private String defaultText(String value, String defaultValue) {
        if (value == null || value.isBlank()) {
            return defaultValue;
        }

        return value;
    }

    private String getLastModifiedTimeSafe(Path path) {
        try {
            return Files.getLastModifiedTime(path).toInstant().toString();
        } catch (IOException e) {
            return "";
        }
    }

    private String readStringIfExists(Path path) {
        try {
            if (!Files.exists(path)) {
                return "";
            }

            return Files.readString(path, StandardCharsets.UTF_8);
        } catch (IOException e) {
            return "";
        }
    }

    private String extractJsonString(String json, String key, String defaultValue) {
        if (json == null || json.isBlank()) {
            return defaultValue;
        }

        Pattern pattern = Pattern.compile("\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*\\\"([^\\\"]*)\\\"");
        Matcher matcher = pattern.matcher(json);

        if (matcher.find()) {
            return matcher.group(1);
        }

        return defaultValue;
    }

    private boolean extractJsonBoolean(String json, String key, boolean defaultValue) {
        if (json == null || json.isBlank()) {
            return defaultValue;
        }

        Pattern pattern = Pattern.compile("\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*(true|false)");
        Matcher matcher = pattern.matcher(json);

        if (matcher.find()) {
            return Boolean.parseBoolean(matcher.group(1));
        }

        return defaultValue;
    }

    private String jsonEscape(String value) {
        return String.valueOf(value == null ? "" : value)
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
