package com.catchcatch.ticket.seatmap;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class SeatMapService {

    private static final Path SEATMAP_JSON_DIR =
            Path.of("src/main/resources/static/json/seatmap");

    public String saveJsonFile(SeatMapRequest.SaveDTO req) {
        try {
            Files.createDirectories(SEATMAP_JSON_DIR);

            String safeFileName = sanitizeFileName(req.getFileName());
            Path savePath = resolveUniquePath(safeFileName);

            Files.writeString(
                    savePath,
                    req.getJson(),
                    StandardCharsets.UTF_8
            );

            return "/json/seatmap/" + savePath.getFileName();

        } catch (IOException e) {
            throw new RuntimeException("좌석 JSON 파일 저장 실패", e);
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
}
