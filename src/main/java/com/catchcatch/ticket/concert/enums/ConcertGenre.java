package com.catchcatch.ticket.concert.enums;

import java.util.Arrays;

public enum ConcertGenre {

    CONCERT("concert", "콘서트"),
    MUSICAL("musical", "뮤지컬"),
    FESTIVAL("festival", "페스티벌"),
    FANMEETING("fanmeeting", "팬미팅"),
    CLASSIC("classic", "클래식"),
    ETC("etc", "기타");

    private final String code;
    private final String label;

    ConcertGenre(String code, String label) {
        this.code = code;
        this.label = label;
    }

    public String getCode() {
        return code;
    }

    public String getLabel() {
        return label;
    }

    public static ConcertGenre fromCode(String code) {
        return Arrays.stream(values())
                .filter(genre -> genre.matches(code))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("지원하지 않는 공연 장르입니다. " + code));
    }

    public static ConcertGenre fromCodeOrNull(String code) {
        if (code == null || code.isBlank() || "all".equalsIgnoreCase(code)) {
            return null;
        }

        return Arrays.stream(values())
                .filter(genre -> genre.matches(code))
                .findFirst()
                .orElse(null);
    }

    private boolean matches(String value) {
        if (value == null) {
            return false;
        }

        return code.equalsIgnoreCase(value) || name().equalsIgnoreCase(value);
    }
}
