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

    private static final String DEFAULT_SEATS_JSON =
            "[{\"id\":\"1-A-1-1-VIP-AVAILABLE\"}]";

    private static final String DEFAULT_SECTIONS_JSON =
            "[{\"id\":\"1-A\",\"name\":\"A구역\",\"grade\":\"VIP\",\"seatCount\":0}]";

    // 새 도면 폴더 생성
    public ProjectCreateResult createProject(SeatMapRequest.ProjectCreateDTO req) {
        try {
            String projectName = defaultText(req.getProjectName(), "콘서트 대형장 도면");
            String folderName = resolveUniqueFolderName(sanitizeFolderName(defaultText(req.getFolderName(), projectName)));
            String folderRelativePath = "temp/seatmap/" + folderName;
            String now = LocalDateTime.now().toString();

            String seatJsonRelativePath = folderRelativePath + "/seatmap-seats.json";
            String sectionJsonRelativePath = folderRelativePath + "/seatmap-sections.json";
            String originalImageRelativePath = folderRelativePath + "/original-image.png";
            String croppedImageRelativePath = folderRelativePath + "/cropped-image.png";
            String imageRelativePath = folderRelativePath + "/seatmap-image.png";
            String metaJsonRelativePath = folderRelativePath + "/seatmap-meta.json";

            writeTextToStaticAll(seatJsonRelativePath, DEFAULT_SEATS_JSON);
            writeTextToStaticAll(sectionJsonRelativePath, DEFAULT_SECTIONS_JSON);

            if (req.getImageDataUrl() != null && req.getImageDataUrl().startsWith("data:image")) {
                byte[] imageBytes = decodeBase64Image(req.getImageDataUrl());
                writeBytesToStaticAll(originalImageRelativePath, imageBytes);
                writeBytesToStaticAll(croppedImageRelativePath, imageBytes);
                writeBytesToStaticAll(imageRelativePath, imageBytes);
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
                    "/" + imageRelativePath,
                    "/" + seatJsonRelativePath,
                    "/" + sectionJsonRelativePath,
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
            String relativePath = "temp/seatmap/" + folderName;

            deleteStaticFolder(relativePath);

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
            String folderRelativePath = "temp/seatmap/" + folderName;

            String seatJsonRelativePath = folderRelativePath + "/seatmap-seats.json";
            String sectionJsonRelativePath = folderRelativePath + "/seatmap-sections.json";
            String imageRelativePath = folderRelativePath + "/seatmap-image.png";
            String croppedImageRelativePath = folderRelativePath + "/cropped-image.png";

            writeTextToStaticAll(seatJsonRelativePath, defaultText(req.getSeatJsonText(), DEFAULT_SEATS_JSON));
            writeTextToStaticAll(sectionJsonRelativePath, defaultText(req.getSectionJsonText(), DEFAULT_SECTIONS_JSON));

            if (req.getImageDataUrl() != null && req.getImageDataUrl().startsWith("data:image")) {
                byte[] imageBytes = decodeBase64Image(req.getImageDataUrl());
                writeBytesToStaticAll(imageRelativePath, imageBytes);

                if ("seatmap-crop-rotate".equals(req.getPage())) {
                    writeBytesToStaticAll(croppedImageRelativePath, imageBytes);
                }
            }

            return new TempSaveResult(
                    true,
                    folderName,
                    "/" + folderRelativePath,
                    "/" + seatJsonRelativePath,
                    "/" + sectionJsonRelativePath,
                    "/" + imageRelativePath,
                    "/" + croppedImageRelativePath
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
        private String seatJsonUrl;
        private String sectionJsonUrl;
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
        private String seatJsonUrl;
        private String sectionJsonUrl;
        private String metaJsonUrl;
    }

    private ProjectSummary toProjectSummary(Path folder) {
        String folderName = folder.getFileName().toString();
        Path metaPath = folder.resolve("seatmap-meta.json");
        String metaText = readStringIfExists(metaPath);
        String projectName = extractJsonString(metaText, "name", folderName);
        String createdAt = extractJsonString(metaText, "createdAt", "");
        String updatedAt = extractJsonString(metaText, "updatedAt", getLastModifiedTimeSafe(folder));
        String folderUrl = "/temp/seatmap/" + folderName;

        return new ProjectSummary(
                projectName,
                folderName,
                createdAt,
                updatedAt,
                folderUrl,
                folderUrl + "/original-image.png",
                folderUrl + "/cropped-image.png",
                folderUrl + "/seatmap-image.png",
                folderUrl + "/seatmap-seats.json",
                folderUrl + "/seatmap-sections.json",
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
                + "\"folderName\":\"" + jsonEscape(folderName) + "\","
                + "\"sourceFileName\":\"" + jsonEscape(sourceFileName) + "\","
                + "\"createdAt\":\"" + jsonEscape(createdAt) + "\","
                + "\"updatedAt\":\"" + jsonEscape(updatedAt) + "\","
                + "\"files\":{"
                + "\"originalImage\":\"original-image.png\","
                + "\"croppedImage\":\"cropped-image.png\","
                + "\"image\":\"seatmap-image.png\","
                + "\"seats\":\"seatmap-seats.json\","
                + "\"sections\":\"seatmap-sections.json\""
                + "}"
                + "}";
    }

    private String resolveUniqueFolderName(String folderName) {
        String baseName = sanitizeFolderName(folderName);
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
            return "concert-session";
        }

        String cleaned = folderName
                .trim()
                .replaceAll("\\s+", "_")
                .replaceAll("[^a-zA-Z0-9가-힣._-]", "_")
                .replaceAll("_+", "_")
                .replaceAll("^_+|_+$", "");

        if (cleaned.isBlank()) {
            return "concert-session";
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
