package com.catchcatch.ticket.seatmap;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

@Service
public class SeatMapService {

    // 저장 패키지 지정
    private static final Path SEATMAP_JSON_DIR =
            Path.of("src/main/resources/static/json/seatmap");

    public String saveJsonFile(SeatMapRequest.SaveDTO req) {
        try {
            Files.createDirectories(SEATMAP_JSON_DIR);

            String safeFileName = sanitizeFileName(req.getFileName());
            Path savePath = SEATMAP_JSON_DIR.resolve(safeFileName);

            Files.writeString(
                    savePath,
                    req.getJson(),
                    StandardCharsets.UTF_8
            );

            return "/json/seatmap/" + safeFileName;

        } catch (IOException e) {
            throw new RuntimeException("좌석 JSON 파일 저장 실패", e);
        }
    }


    private String sanitizeFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "seatmap.json";
        }

        String cleaned = fileName.replaceAll("[^a-zA-Z0-9가-힣._-]", "_");

        if (!cleaned.endsWith(".json")) {
            cleaned += ".json";
        }

        return cleaned;
    }
}