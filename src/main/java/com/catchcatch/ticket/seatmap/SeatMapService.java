package com.catchcatch.ticket.seatmap;

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
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class SeatMapService {

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

    private static final String DEFAULT_SEATS_JSON = """
            [
              {
                "id": "1-VIP-A-1-VIP-AVAILABLE"
              }
            ]
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

    // 새 도면 폴더 생성
    public ProjectCreateResult createProject(SeatMapRequest.ProjectCreateDTO req) {
        try {
            String projectName = defaultText(req.getProjectName(), "콘서트 대형장 도면");
            String folderName = resolveUniqueFolderName(sanitizeFolderName(defaultText(req.getFolderName(), projectName)));
            String folderRelativePath = projectFolderRelativePath(folderName);
            String seatsJsonRelativePath = seatsJsonRelativePath(folderName);
            String now = LocalDateTime.now().toString();

            String originalImageRelativePath = folderRelativePath + "/original-image.png";
            String croppedImageRelativePath = folderRelativePath + "/cropped-image.png";
            String seatmapImageRelativePath = folderRelativePath + "/seatmap-image.png";
            String buttonImageRelativePath = folderRelativePath + "/button-image.png";
            String thumbnailImageRelativePath = folderRelativePath + "/thumbnail.png";
            String debugImageRelativePath = folderRelativePath + "/debug-polygons.png";
            String sectionJsonRelativePath = folderRelativePath + "/seatmap-sections.json";
            String bookingButtonsJsonRelativePath = folderRelativePath + "/booking-buttons.json";
            String decorationsJsonRelativePath = folderRelativePath + "/seatmap-decorations.json";
            String metaJsonRelativePath = folderRelativePath + "/seatmap-meta.json";

            writeTextToStaticAll(seatsJsonRelativePath, DEFAULT_SEATS_JSON);
            writeTextToStaticAll(sectionJsonRelativePath, DEFAULT_SECTIONS_JSON);
            writeTextToStaticAll(bookingButtonsJsonRelativePath, DEFAULT_BOOKING_BUTTONS_JSON);
            writeTextToStaticAll(decorationsJsonRelativePath, DEFAULT_DECORATIONS_JSON);

            if (req.getImageDataUrl() != null && req.getImageDataUrl().startsWith("data:image")) {
                byte[] imageBytes = decodeBase64Image(req.getImageDataUrl());

                // 새 도면 생성 시 각 단계가 바로 진입할 수 있도록 기본 PNG 세트를 전부 만든다.
                writeBytesToStaticAll(originalImageRelativePath, imageBytes);   // 01 입력 원본
                writeBytesToStaticAll(croppedImageRelativePath, imageBytes);    // 01 출력 / 02 입력
                writeBytesToStaticAll(seatmapImageRelativePath, imageBytes);    // 05~06 / booking 기준 이미지
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
                    "/" + debugImageRelativePath,
                    "/" + seatsJsonRelativePath,
                    "/" + sectionJsonRelativePath,
                    "/" + bookingButtonsJsonRelativePath,
                    "/" + decorationsJsonRelativePath,
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
            deleteStaticFile(seatsJsonRelativePath(folderName));
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
            String seatsJsonPath = seatsJsonRelativePath(folderName);

            String sectionJsonPath = folderRelativePath + "/seatmap-sections.json";
            String bookingButtonsJsonPath = folderRelativePath + "/booking-buttons.json";
            String decorationsJsonPath = folderRelativePath + "/seatmap-decorations.json";
            String croppedImagePath = folderRelativePath + "/cropped-image.png";
            String seatmapImagePath = folderRelativePath + "/seatmap-image.png";
            String buttonImagePath = folderRelativePath + "/button-image.png";
            String thumbnailPath = folderRelativePath + "/thumbnail.png";
            String debugImagePath = folderRelativePath + "/debug-polygons.png";
            String imageUrl = "/" + seatmapImagePath;

            if (req.getSeatJsonText() != null && !req.getSeatJsonText().isBlank()) {
                writeTextToStaticAll(seatsJsonPath, req.getSeatJsonText());
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

            if (req.getImageDataUrl() != null && req.getImageDataUrl().startsWith("data:image")) {
                byte[] imageBytes = decodeBase64Image(req.getImageDataUrl());
                String page = defaultText(req.getPage(), "");

                if ("stage1".equals(page) || "seatmap-crop-rotate".equals(page) || "crop-rotate".equals(page)) {
                    // Stage 1은 이후 단계의 기준 도면을 바꾸는 작업이다.
                    // 자르기/방향 보정 저장 시 이후 단계가 stale 이미지를 물고 가지 않도록
                    // original-image.png를 제외한 모든 PNG 기준 파일을 같은 이미지로 초기화한다.
                    writeBytesToStaticAll(croppedImagePath, imageBytes);
                    writeBytesToStaticAll(seatmapImagePath, imageBytes);
                    writeBytesToStaticAll(buttonImagePath, imageBytes);
                    writeBytesToStaticAll(thumbnailPath, imageBytes);
                    writeBytesToStaticAll(debugImagePath, imageBytes);
                    imageUrl = "/" + croppedImagePath;
                } else if ("stage2".equals(page) || "seatmap-button-image".equals(page) || "button-image".equals(page)) {
                    writeBytesToStaticAll(buttonImagePath, imageBytes);
                    imageUrl = "/" + buttonImagePath;
                } else if ("stage6".equals(page) || "seatmap-final-decorate".equals(page) || "final-decorate".equals(page)) {
                    writeBytesToStaticAll(seatmapImagePath, imageBytes);
                    writeBytesToStaticAll(thumbnailPath, imageBytes);
                    imageUrl = "/" + seatmapImagePath;
                } else if ("stage3".equals(page) || "stage4".equals(page) || "stage5".equals(page) || "booking-buttons".equals(page)) {
                    // Stage 3~5의 이미지 저장은 최종 도면을 덮지 않고 검수용 debug 이미지로만 저장한다.
                    writeBytesToStaticAll(debugImagePath, imageBytes);
                    imageUrl = "/" + debugImagePath;
                } else {
                    writeBytesToStaticAll(seatmapImagePath, imageBytes);
                    imageUrl = "/" + seatmapImagePath;
                }
            }

            // 과거 잘못 생성된 프로젝트 내부 seatmap-seats.json은 저장 시 제거한다.
            deleteStaticFile(folderRelativePath + "/seatmap-seats.json");

            writeTempSaveMeta(folderName, folderRelativePath, defaultText(req.getPage(), ""));

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
                    "/" + debugImagePath,
                    "/" + bookingButtonsJsonPath,
                    "/" + decorationsJsonPath
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
        private String debugImageUrl;
        private String bookingButtonsJsonUrl;
        private String decorationsJsonUrl;
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
        private String debugImageUrl;
        private String seatJsonUrl;
        private String sectionJsonUrl;
        private String bookingButtonsJsonUrl;
        private String decorationsJsonUrl;
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
        private String debugImageUrl;
        private String seatJsonUrl;
        private String sectionJsonUrl;
        private String bookingButtonsJsonUrl;
        private String decorationsJsonUrl;
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
                folderUrl + "/debug-polygons.png",
                "/" + seatsJsonRelativePath(folderName),
                folderUrl + "/seatmap-sections.json",
                folderUrl + "/booking-buttons.json",
                folderUrl + "/seatmap-decorations.json",
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
        return "{"
                + "\"name\":\"" + jsonEscape(projectName) + "\","
                + "\"type\":\"CONCERT\","
                + "\"status\":\"" + jsonEscape(status) + "\","
                + "\"currentStage\":\"" + jsonEscape(extractCurrentStage(status)) + "\","
                + "\"folderName\":\"" + jsonEscape(folderName) + "\","
                + "\"sourceFileName\":\"" + jsonEscape(sourceFileName) + "\","
                + "\"createdAt\":\"" + jsonEscape(createdAt) + "\","
                + "\"updatedAt\":\"" + jsonEscape(updatedAt) + "\","
                + "\"files\":{"
                + "\"originalImage\":\"original-image.png\","
                + "\"croppedImage\":\"cropped-image.png\","
                + "\"seatmapImage\":\"seatmap-image.png\","
                + "\"buttonImage\":\"button-image.png\","
                + "\"thumbnail\":\"thumbnail.png\","
                + "\"debugPolygons\":\"debug-polygons.png\","
                + "\"sections\":\"seatmap-sections.json\","
                + "\"bookingButtons\":\"booking-buttons.json\","
                + "\"decorations\":\"seatmap-decorations.json\","
                + "\"seats\":\"/temp/seatmap/seats/" + jsonEscape(folderName) + "-seatmap-seats.json\""
                + "}"
                + "}";
    }


    private void writeTempSaveMeta(String folderName, String folderRelativePath, String page) throws IOException {
        String metaJsonPath = folderRelativePath + "/seatmap-meta.json";
        String previousMeta = readStringIfExists(SOURCE_STATIC_DIR.resolve(metaJsonPath));
        String now = LocalDateTime.now().toString();
        String projectName = extractJsonString(previousMeta, "name", folderName);
        String sourceFileName = extractJsonString(previousMeta, "sourceFileName", "");
        String createdAt = extractJsonString(previousMeta, "createdAt", now);
        String status = resolveTempSaveStatus(page);

        writeTextToStaticAll(
                metaJsonPath,
                buildMetaJson(projectName, folderName, sourceFileName, createdAt, now, status)
        );
    }

    private String resolveTempSaveStatus(String page) {
        return switch (defaultText(page, "")) {
            case "stage1", "seatmap-crop-rotate", "crop-rotate" -> "STAGE1_CROPPED_IMAGE_READY";
            case "stage2", "seatmap-button-image", "button-image" -> "STAGE2_BUTTON_IMAGE_READY";
            case "stage3", "booking-buttons" -> "STAGE3_SECTIONS_READY";
            case "stage4" -> "STAGE4_SEATS_READY";
            case "stage5" -> "STAGE5_BOOKING_BUTTONS_READY";
            case "stage6", "seatmap-final-decorate", "final-decorate" -> "STAGE6_FINAL_IMAGE_READY";
            default -> "UPDATED";
        };
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

    private String seatsJsonRelativePath(String folderName) {
        return "temp/seatmap/seats/" + sanitizeFolderName(folderName) + "-seatmap-seats.json";
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

    private String jsonEscape(String value) {
        return String.valueOf(value == null ? "" : value)
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
