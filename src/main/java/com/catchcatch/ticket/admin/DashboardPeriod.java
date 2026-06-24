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

    /** 이전 기간의 시작 — 증감 비교에 사용 */
    public Timestamp prevStartAt() {
        LocalDate today = LocalDate.now();
        LocalDateTime start = switch (this) {
            case TODAY -> today.minusDays(1).atStartOfDay();
            case WEEK  -> today.minusDays(13).atStartOfDay();
            case MONTH -> today.minusDays(59).atStartOfDay();
        };
        return Timestamp.valueOf(start);
    }

    /** 이전 기간의 끝 — 증감 비교에 사용 */
    public Timestamp prevEndAt() {
        LocalDate today = LocalDate.now();
        LocalDateTime end = switch (this) {
            case TODAY -> today.atStartOfDay();
            case WEEK  -> today.minusDays(7).atStartOfDay();
            case MONTH -> today.minusDays(30).atStartOfDay();
        };
        return Timestamp.valueOf(end);
    }

    /** 증감 레이블 ("전일", "전주", "전월") */
    public String diffLabel() {
        return switch (this) {
            case TODAY -> "전일";
            case WEEK  -> "전주";
            case MONTH -> "전월";
        };
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