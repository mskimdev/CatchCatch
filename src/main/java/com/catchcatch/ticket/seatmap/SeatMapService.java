package com.catchcatch.ticket.seatmap;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Base64;

@Service
public class SeatMapService {

    private static final Path SEATMAP_JSON_DIR =
            Path.of("src/main/resources/static/json/seatmap");

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

    // header 파일 저장
    public TempSaveResult tempSave(SeatMapRequest.TempSaveDTO req) {
        try {
            String folderRelativePath = "temp/seatmap/concert-session";

            String seatJsonRelativePath = folderRelativePath + "/seatmap-seats.json";
            String sectionJsonRelativePath = folderRelativePath + "/seatmap-sections.json";
            String imageRelativePath = folderRelativePath + "/seatmap-image.png";

            writeTextToStaticAll(seatJsonRelativePath, req.getSeatJsonText());
            writeTextToStaticAll(sectionJsonRelativePath, req.getSectionJsonText());

            if (req.getImageDataUrl() != null && req.getImageDataUrl().startsWith("data:image")) {
                writeBytesToStaticAll(imageRelativePath, decodeBase64Image(req.getImageDataUrl()));
            }

            return new TempSaveResult(
                    true,
                    "/" + seatJsonRelativePath,
                    "/" + sectionJsonRelativePath,
                    "/" + imageRelativePath
            );
        } catch (Exception e) {
            throw new RuntimeException("좌석도 임시 저장 실패", e);
        }
    }

    @Getter
    @AllArgsConstructor
    public static class TempSaveResult {
        private boolean success;
        private String seatJsonUrl;
        private String sectionJsonUrl;
        private String imageUrl;
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

    // 저장 관련 함수
    private static final Path SOURCE_STATIC_DIR =
            Path.of("src/main/resources/static");

    private static final Path MAVEN_RUNTIME_STATIC_DIR =
            Path.of("target/classes/static");

    private static final Path GRADLE_RUNTIME_STATIC_DIR =
            Path.of("build/resources/main/static");

    private void writeTextToStaticAll(String relativePath, String text) throws IOException {
        writeText(SOURCE_STATIC_DIR.resolve(relativePath), text);
        writeText(MAVEN_RUNTIME_STATIC_DIR.resolve(relativePath), text);
        writeText(GRADLE_RUNTIME_STATIC_DIR.resolve(relativePath), text);
    }

    private void writeBytesToStaticAll(String relativePath, byte[] bytes) throws IOException {
        writeBytes(SOURCE_STATIC_DIR.resolve(relativePath), bytes);
        writeBytes(MAVEN_RUNTIME_STATIC_DIR.resolve(relativePath), bytes);
        writeBytes(GRADLE_RUNTIME_STATIC_DIR.resolve(relativePath), bytes);
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
}
