package com.catchcatch.ticket.core.util;

import java.sql.Timestamp;
import java.time.format.DateTimeFormatter;

public class DateUtil {

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy.MM.dd");
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

    public static String formatTime(java.time.LocalTime time) {
        if (time == null) return "";
        return time.format(TIME_FORMATTER);
    }
}
