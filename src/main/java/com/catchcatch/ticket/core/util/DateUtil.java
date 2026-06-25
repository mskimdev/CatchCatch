package com.catchcatch.ticket.core.util;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public class DateUtil {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy.MM.dd");
    private static final DateTimeFormatter DATE_INPUT_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy.MM.dd HH:mm");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    public static String format(Timestamp timestamp) {
        if (timestamp == null) return "";
        return timestamp.toLocalDateTime().format(DATE_FORMATTER);
    }

    public static String formatDateTime(Timestamp timestamp) {
        if (timestamp == null) return "";
        return timestamp.toLocalDateTime().format(DATETIME_FORMATTER);
    }

    public static String formatTime(LocalTime time) {
        if (time == null) return "";
        return time.format(TIME_FORMATTER);
    }

    /**
     * "yyyy-MM-dd" 형식의 날짜 문자열을 Timestamp로 변환.
     * 시작일은 00:00:00, 종료일은 23:59:59로 처리하려면 호출 쪽에서 직접 조정.
     */
    // input[type=date] 용 "yyyy-MM-dd" 형식
    public static String formatForInput(Timestamp timestamp) {
        if (timestamp == null) return "";
        return timestamp.toLocalDateTime().format(DATE_INPUT_FORMATTER);
    }

    public static Timestamp parseToTimestamp(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return null;
        LocalDate date = LocalDate.parse(dateStr.trim());
        return Timestamp.valueOf(LocalDateTime.of(date, LocalTime.MIDNIGHT));
    }
}
