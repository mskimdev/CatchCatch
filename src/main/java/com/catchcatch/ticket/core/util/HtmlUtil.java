package com.catchcatch.ticket.core.util;

import org.springframework.core.io.ClassPathResource;

import java.nio.charset.StandardCharsets;

public class HtmlUtil {

    public static String load(String path) {
        try {
            ClassPathResource resource = new ClassPathResource(path);
            return new String(resource.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
        } catch (Exception e) {
            throw new RuntimeException("HTML 파일 로드 실패: " + path, e);
        }
    }

    public static String loadWithPlaceholder(String path, String placeholder, String value) {
        return load(path).replace(placeholder, value);
    }
}
