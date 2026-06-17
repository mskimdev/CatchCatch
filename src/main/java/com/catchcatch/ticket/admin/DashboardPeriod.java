package com.catchcatch.ticket.admin;

import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.LocalDateTime;

public enum DashboardPeriod {
    TODAY,
    WEEK,
    MONTH;

    public Timestamp startAt() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = switch (this) {
            case TODAY -> today.atStartOfDay();
            case WEEK -> today.minusDays(6).atStartOfDay();
            case MONTH -> today.minusDays(29).atStartOfDay();
        };
        return Timestamp.valueOf(start);
    }

    public Timestamp endAt() {
        return Timestamp.valueOf(LocalDateTime.now());
    }

    public static DashboardPeriod from(String value) {
        if (value == null || value.isBlank()) {
            return TODAY;
        }
        try {
            return DashboardPeriod.valueOf(value.toUpperCase());
        } catch (IllegalArgumentException e) {
            return TODAY;
        }
    }
}