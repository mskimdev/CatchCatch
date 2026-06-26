package com.catchcatch.ticket.concert.core;

public final class ConcertGenreLabel {

    private ConcertGenreLabel() {
    }

    public static String of(String genre) {
        if (genre == null || genre.isBlank()) {
            return "콘서트";
        }

        return switch (genre.toLowerCase()) {
            case "concert" -> "콘서트";
            case "musical" -> "뮤지컬";
            case "festival" -> "페스티벌";
            case "fanmeeting" -> "팬미팅";
            case "classic" -> "클래식";
            case "etc" -> "기타";
            default -> genre;
        };
    }
}
